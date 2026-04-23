# ── RDS PostgreSQL (production) ───────────────────────────────────────────────
variable "db_password" {
  sensitive = true
  default   = "change-me-in-tfvars"
}

variable "vpc_id"             { default = "" }
variable "private_subnet_ids" { default = [] }

resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnets"
  subnet_ids = var.private_subnet_ids

  tags = { Project = var.project_name }
}

resource "aws_security_group" "rds" {
  name   = "${var.project_name}-rds-sg"
  vpc_id = var.vpc_id

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Project = var.project_name }
}

resource "aws_db_instance" "main" {
  identifier             = "${var.project_name}-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16"
  instance_class         = "db.t4g.medium"
  allocated_storage      = 20
  max_allocated_storage  = 100
  storage_type           = "gp3"
  storage_encrypted      = true
  kms_key_id             = aws_kms_key.artefacts.arn

  db_name  = "dataguard"
  username = "dataguard"
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = true

  backup_retention_period    = 14
  backup_window              = "03:00-04:00"
  maintenance_window         = "Mon:04:00-Mon:05:00"
  deletion_protection        = true
  skip_final_snapshot        = false
  final_snapshot_identifier  = "${var.project_name}-final"

  performance_insights_enabled = true
  monitoring_interval          = 60

  tags = { Project = var.project_name, Env = var.environment }
}

output "rds_endpoint" { value = aws_db_instance.main.endpoint }
output "rds_port"     { value = aws_db_instance.main.port }
