import html
import secrets
import string
from urllib.parse import quote


CODE_ALPHABET = string.digits

CODE39_PATTERNS = {
    "0": "nnnwwnwnn",
    "1": "wnnwnnnnw",
    "2": "nnwwnnnnw",
    "3": "wnwwnnnnn",
    "4": "nnnwwnnnw",
    "5": "wnnwwnnnn",
    "6": "nnwwwnnnn",
    "7": "nnnwnnwnw",
    "8": "wnnwnnwnn",
    "9": "nnwwnnwnn",
    "A": "wnnnnwnnw",
    "B": "nnwnnwnnw",
    "C": "wnwnnwnnn",
    "D": "nnnnwwnnw",
    "E": "wnnnwwnnn",
    "F": "nnwnwwnnn",
    "G": "nnnnnwwnw",
    "H": "wnnnnwwnn",
    "I": "nnwnnwwnn",
    "J": "nnnnwwwnn",
    "K": "wnnnnnnww",
    "L": "nnwnnnnww",
    "M": "wnwnnnnwn",
    "N": "nnnnwnnww",
    "O": "wnnnwnnwn",
    "P": "nnwnwnnwn",
    "Q": "nnnnnnwww",
    "R": "wnnnnnwwn",
    "S": "nnwnnnwwn",
    "T": "nnnnwnwwn",
    "U": "wwnnnnnnw",
    "V": "nwwnnnnnw",
    "W": "wwwnnnnnn",
    "X": "nwnnwnnnw",
    "Y": "wwnnwnnnn",
    "Z": "nwwnwnnnn",
    "-": "nwnnnnwnw",
    ".": "wwnnnnwnn",
    " ": "nwwnnnwnn",
    "$": "nwnwnwnnn",
    "/": "nwnwnnnwn",
    "+": "nwnnnwnwn",
    "%": "nnnwnwnwn",
    "*": "nwnnwnwnn",
}


def generate_join_code(length: int = 4) -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def generate_unique_join_code(db, group_model, attempts: int = 100) -> str:
    for _ in range(attempts):
        code = generate_join_code()
        exists = db.query(group_model.id).filter(group_model.join_code == code).first()
        if not exists:
            return code
    raise RuntimeError("Unable to generate a unique group join code.")


def normalize_join_code(value: str) -> str:
    return (value or "").strip().upper().replace(" ", "").replace("-", "")


def is_simple_join_code(value: str | None) -> bool:
    normalized = normalize_join_code(value or "")
    return len(normalized) == 4 and normalized.isdigit()


QR_SIZE = 21
QR_QUIET_ZONE = 4
QR_DATA_CODEWORDS = 19
QR_ECC_CODEWORDS = 7
QR_ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:"
QR_ALPHANUMERIC_INDEX = {char: index for index, char in enumerate(QR_ALPHANUMERIC)}


def _append_bits(bits: list[int], value: int, length: int) -> None:
    for index in range(length - 1, -1, -1):
        bits.append((value >> index) & 1)


def _join_code_data_codewords(code: str) -> list[int]:
    normalized = normalize_join_code(code)
    if any(char not in QR_ALPHANUMERIC_INDEX for char in normalized):
        raise ValueError("Join code contains characters that cannot be encoded as a QR code.")

    bits: list[int] = []
    _append_bits(bits, 0b0010, 4)
    _append_bits(bits, len(normalized), 9)

    index = 0
    while index + 1 < len(normalized):
        pair_value = QR_ALPHANUMERIC_INDEX[normalized[index]] * 45 + QR_ALPHANUMERIC_INDEX[normalized[index + 1]]
        _append_bits(bits, pair_value, 11)
        index += 2
    if index < len(normalized):
        _append_bits(bits, QR_ALPHANUMERIC_INDEX[normalized[index]], 6)

    capacity_bits = QR_DATA_CODEWORDS * 8
    if len(bits) > capacity_bits:
        raise ValueError("Join code is too long for the QR code renderer.")

    _append_bits(bits, 0, min(4, capacity_bits - len(bits)))
    while len(bits) % 8:
        bits.append(0)

    codewords = [
        sum(bit << (7 - offset) for offset, bit in enumerate(bits[index:index + 8]))
        for index in range(0, len(bits), 8)
    ]
    while len(codewords) < QR_DATA_CODEWORDS:
        codewords.append(0xEC if len(codewords) % 2 == 0 else 0x11)
    return codewords


def _gf_multiply(left: int, right: int) -> int:
    result = 0
    while right:
        if right & 1:
            result ^= left
        right >>= 1
        left <<= 1
        if left & 0x100:
            left ^= 0x11D
    return result


def _reed_solomon_divisor(degree: int) -> list[int]:
    result = [0] * (degree - 1) + [1]
    root = 1
    for _ in range(degree):
        for index in range(degree):
            result[index] = _gf_multiply(result[index], root)
            if index + 1 < degree:
                result[index] ^= result[index + 1]
        root = _gf_multiply(root, 0x02)
    return result


def _reed_solomon_remainder(data: list[int], divisor: list[int]) -> list[int]:
    result = [0] * len(divisor)
    for value in data:
        factor = value ^ result.pop(0)
        result.append(0)
        for index, coefficient in enumerate(divisor):
            result[index] ^= _gf_multiply(coefficient, factor)
    return result


def _format_bits(mask: int) -> int:
    data = (0b01 << 3) | mask
    remainder = data
    for _ in range(10):
        remainder = (remainder << 1) ^ ((remainder >> 9) * 0x537)
    return ((data << 10) | (remainder & 0x3FF)) ^ 0x5412


def _set_function_module(matrix: list[list[bool | None]], reserved: list[list[bool]], x: int, y: int, dark: bool) -> None:
    if 0 <= x < QR_SIZE and 0 <= y < QR_SIZE:
        matrix[y][x] = dark
        reserved[y][x] = True


def _draw_finder(matrix: list[list[bool | None]], reserved: list[list[bool]], x: int, y: int) -> None:
    for dy in range(-1, 8):
        for dx in range(-1, 8):
            xx = x + dx
            yy = y + dy
            if not (0 <= xx < QR_SIZE and 0 <= yy < QR_SIZE):
                continue
            dark = (
                0 <= dx <= 6
                and 0 <= dy <= 6
                and (dx in {0, 6} or dy in {0, 6} or (2 <= dx <= 4 and 2 <= dy <= 4))
            )
            _set_function_module(matrix, reserved, xx, yy, dark)


def _draw_function_patterns(matrix: list[list[bool | None]], reserved: list[list[bool]], mask: int) -> None:
    _draw_finder(matrix, reserved, 0, 0)
    _draw_finder(matrix, reserved, QR_SIZE - 7, 0)
    _draw_finder(matrix, reserved, 0, QR_SIZE - 7)

    for index in range(8, QR_SIZE - 8):
        dark = index % 2 == 0
        _set_function_module(matrix, reserved, index, 6, dark)
        _set_function_module(matrix, reserved, 6, index, dark)

    bits = _format_bits(mask)
    for index in range(6):
        _set_function_module(matrix, reserved, 8, index, ((bits >> index) & 1) == 1)
    _set_function_module(matrix, reserved, 8, 7, ((bits >> 6) & 1) == 1)
    _set_function_module(matrix, reserved, 8, 8, ((bits >> 7) & 1) == 1)
    _set_function_module(matrix, reserved, 7, 8, ((bits >> 8) & 1) == 1)
    for index in range(9, 15):
        _set_function_module(matrix, reserved, 14 - index, 8, ((bits >> index) & 1) == 1)
    for index in range(8):
        _set_function_module(matrix, reserved, QR_SIZE - 1 - index, 8, ((bits >> index) & 1) == 1)
    for index in range(8, 15):
        _set_function_module(matrix, reserved, 8, QR_SIZE - 15 + index, ((bits >> index) & 1) == 1)
    _set_function_module(matrix, reserved, 8, QR_SIZE - 8, True)


def _mask_bit(mask: int, x: int, y: int) -> bool:
    if mask == 0:
        return (x + y) % 2 == 0
    raise ValueError("Unsupported QR mask.")


def _qr_matrix_for_code(code: str) -> list[list[bool]]:
    mask = 0
    data = _join_code_data_codewords(code)
    divisor = _reed_solomon_divisor(QR_ECC_CODEWORDS)
    codewords = data + _reed_solomon_remainder(data, divisor)
    total_bits = len(codewords) * 8

    matrix: list[list[bool | None]] = [[None for _ in range(QR_SIZE)] for _ in range(QR_SIZE)]
    reserved = [[False for _ in range(QR_SIZE)] for _ in range(QR_SIZE)]
    _draw_function_patterns(matrix, reserved, mask)

    bit_index = 0
    right = QR_SIZE - 1
    while right >= 1:
        if right == 6:
            right -= 1
        upward = ((right + 1) & 2) == 0
        for vertical in range(QR_SIZE):
            y = QR_SIZE - 1 - vertical if upward else vertical
            for offset in range(2):
                x = right - offset
                if reserved[y][x]:
                    continue
                dark = False
                if bit_index < total_bits:
                    dark = ((codewords[bit_index >> 3] >> (7 - (bit_index & 7))) & 1) == 1
                    bit_index += 1
                if _mask_bit(mask, x, y):
                    dark = not dark
                matrix[y][x] = dark
        right -= 2

    return [[bool(module) for module in row] for row in matrix]


def barcode_svg_for_code(code: str) -> str:
    normalized = normalize_join_code(code)
    matrix = _qr_matrix_for_code(normalized)
    view_size = QR_SIZE + (QR_QUIET_ZONE * 2)
    safe_code = html.escape(normalized)
    modules = []
    for y, row in enumerate(matrix):
        for x, dark in enumerate(row):
            if dark:
                modules.append(f"M{x + QR_QUIET_ZONE},{y + QR_QUIET_ZONE}h1v1h-1z")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 {view_size} {view_size}" '
        f'role="img" aria-label="Join QR code {safe_code}" shape-rendering="crispEdges">'
        '<rect width="100%" height="100%" fill="#ffffff"/>'
        f'<path d="{"".join(modules)}" fill="#000000"/>'
        '</svg>'
    )


def barcode_data_url(code: str) -> str:
    return f"data:image/svg+xml;charset=utf-8,{quote(barcode_svg_for_code(code))}"
