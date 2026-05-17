from sqlalchemy import inspect, text


def ensure_group_schema(engine):
    inspector = inspect(engine)
    if "groups" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("groups")}
    statements = []

    if "join_code" not in columns:
        statements.append("ALTER TABLE groups ADD COLUMN join_code VARCHAR")

    if engine.dialect.name in {"postgresql", "sqlite"}:
        statements.append("CREATE UNIQUE INDEX IF NOT EXISTS ix_groups_join_code ON groups (join_code)")

    if not statements:
        return

    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
