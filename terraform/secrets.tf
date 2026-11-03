# All lab secrets live under "<project>/" in Secrets Manager. External Secrets
# Operator syncs them into Kubernetes; nothing secret is ever stored in git.
#
# recovery_window_in_days = 0 deletes immediately on destroy, so the lab can be
# re-created with the same names right away.

resource "aws_secretsmanager_secret" "db_master" {
  name                    = "${local.secret_prefix}/rds/master"
  description             = "RDS PostgreSQL master credential (used only by the db-bootstrap Job)"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "db_master" {
  secret_id = aws_secretsmanager_secret.db_master.id
  secret_string = jsonencode({
    username = aws_db_instance.this.username
    password = random_password.db_master.result
    host     = aws_db_instance.this.address
    port     = tostring(aws_db_instance.this.port)
    dbname   = "postgres"
  })
}

resource "aws_secretsmanager_secret" "app_db" {
  for_each = local.apps

  name                    = "${local.secret_prefix}/apps/${each.key}/db"
  description             = "Database credential for ${each.value.title}"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "app_db" {
  for_each = local.apps

  secret_id = aws_secretsmanager_secret.app_db[each.key].id
  secret_string = jsonencode({
    username = "${each.key}_app"
    password = random_password.app_db[each.key].result
    host     = aws_db_instance.this.address
    port     = tostring(aws_db_instance.this.port)
    dbname   = each.key
  })

  # Break/fix scenarios edit this value in place and reset.sh restores it;
  # Terraform remains the source of truth on the next apply.
}

resource "random_password" "grafana_admin" {
  length  = 24
  special = false
}

resource "aws_secretsmanager_secret" "grafana_admin" {
  name                    = "${local.secret_prefix}/grafana/admin"
  description             = "Grafana admin login"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "grafana_admin" {
  secret_id = aws_secretsmanager_secret.grafana_admin.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.grafana_admin.result
  })
}
