# ── AWS Secrets Manager — central secret store for production ─────────────────
#
# Stores all runtime secrets in one JSON object.
# The backend reads these at startup via Settings.validate_secrets()
# when AWS_SECRETS_MANAGER_NAME is set.
#
# Rotate the secret with:
#   aws secretsmanager rotate-secret --secret-id dataguard/production

resource "aws_secretsmanager_secret" "app" {
  name                    = "${var.project_name}/${var.environment}"
  description             = "DataGuard runtime secrets"
  recovery_window_in_days = 7
  kms_key_id              = aws_kms_key.artefacts.arn

  tags = { Project = var.project_name, Env = var.environment }
}

resource "aws_secretsmanager_secret_version" "app_initial" {
  secret_id = aws_secretsmanager_secret.app.id

  # Populate with empty/placeholder values.
  # Replace via AWS Console / CLI after first apply:
  #   aws secretsmanager put-secret-value \
  #     --secret-id dataguard/production \
  #     --secret-string '{"SECRET_KEY":"...","POSTGRES_PASSWORD":"...","REDIS_PASSWORD":"...",...}'
  secret_string = jsonencode({
    SECRET_KEY        = "REPLACE_AFTER_APPLY"
    POSTGRES_PASSWORD = "REPLACE_AFTER_APPLY"
    REDIS_PASSWORD    = "REPLACE_AFTER_APPLY"
    FLOWER_PASSWORD   = "REPLACE_AFTER_APPLY"
    HIBP_API_KEY      = ""
    MAILGUN_API_KEY   = ""
  })

  lifecycle {
    # Prevent Terraform from overwriting a secret that has been set manually.
    ignore_changes = [secret_string]
  }
}

# ── IAM: allow the backend task role to read this secret ─────────────────────
resource "aws_iam_policy" "read_app_secret" {
  name = "${var.project_name}-read-app-secret"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "GetSecret"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"]
        Resource = [aws_secretsmanager_secret.app.arn]
      },
      {
        Sid      = "DecryptWithKMS"
        Effect   = "Allow"
        Action   = ["kms:Decrypt", "kms:DescribeKey"]
        Resource = [aws_kms_key.artefacts.arn]
      }
    ]
  })
}

output "secrets_manager_arn"  { value = aws_secretsmanager_secret.app.arn }
output "secrets_manager_name" { value = aws_secretsmanager_secret.app.name }
