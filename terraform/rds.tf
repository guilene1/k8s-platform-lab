# One shared RDS for PostgreSQL instance outside the cluster. The 10 app
# databases and their least-privilege users are created inside the cluster by
# the db-bootstrap Job (gitops/platform/db-bootstrap), because the instance is
# private and unreachable from the student's laptop.

resource "aws_db_subnet_group" "this" {
  name       = "${local.name}-db"
  subnet_ids = module.vpc.private_subnets
}

resource "aws_security_group" "rds" {
  name        = "${local.name}-rds"
  description = "PostgreSQL access from EKS pods only"
  vpc_id      = module.vpc.vpc_id
}

# Kept as a standalone rule (not inline) so the "rds-sg" break/fix scenario can
# revoke and restore exactly this rule without touching anything else.
resource "aws_vpc_security_group_ingress_rule" "rds_from_nodes" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL from EKS nodes and pods"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = module.eks.node_security_group_id
}

resource "random_password" "db_master" {
  length           = 32
  special          = true
  override_special = "-_"
}

resource "aws_db_instance" "this" {
  identifier     = "${local.name}-postgres"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = 20
  max_allocated_storage = 50
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = "postgres"
  username = "lab_admin"
  password = random_password.db_master.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  auto_minor_version_upgrade = true
  backup_retention_period    = 1
  copy_tags_to_snapshot      = true

  # Lab settings so `terraform destroy` is fast and complete.
  deletion_protection = false
  skip_final_snapshot = true
  apply_immediately   = true
}

# One password per app database user.
resource "random_password" "app_db" {
  for_each = local.apps

  length           = 32
  special          = true
  override_special = "-_"
}
