terraform {
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.0" }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region"   { default = "us-east-1" }
variable "project_name" { default = "dataguard" }
variable "environment"  { default = "production" }

# ── KMS key for envelope encryption ──────────────────────────────────────────
resource "aws_kms_key" "artefacts" {
  description             = "${var.project_name} artefact encryption key"
  deletion_window_in_days = 14
  enable_key_rotation     = true

  tags = { Project = var.project_name, Env = var.environment }
}

resource "aws_kms_alias" "artefacts" {
  name          = "alias/${var.project_name}-artefacts"
  target_key_id = aws_kms_key.artefacts.key_id
}

# ── S3 bucket (encrypted, versioned, private) ─────────────────────────────────
resource "aws_s3_bucket" "artefacts" {
  bucket        = "${var.project_name}-artefacts-${var.environment}"
  force_destroy = false

  tags = { Project = var.project_name, Env = var.environment }
}

resource "aws_s3_bucket_versioning" "artefacts" {
  bucket = aws_s3_bucket.artefacts.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "artefacts" {
  bucket = aws_s3_bucket.artefacts.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.artefacts.arn
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "artefacts" {
  bucket                  = aws_s3_bucket.artefacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "artefacts" {
  bucket = aws_s3_bucket.artefacts.id
  rule {
    id     = "expire-reports"
    status = "Enabled"
    filter { prefix = "reports/" }
    expiration { days = 30 }
  }
  rule {
    id     = "expire-bloom"
    status = "Enabled"
    filter { prefix = "bloom/" }
    noncurrent_version_expiration { noncurrent_days = 7 }
  }
}

# ── IAM policy for backend ────────────────────────────────────────────────────
resource "aws_iam_policy" "backend_s3_kms" {
  name = "${var.project_name}-backend-s3-kms"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
        Resource = [
          aws_s3_bucket.artefacts.arn,
          "${aws_s3_bucket.artefacts.arn}/*"
        ]
      },
      {
        Sid      = "KMSAccess"
        Effect   = "Allow"
        Action   = ["kms:GenerateDataKey", "kms:Decrypt", "kms:DescribeKey"]
        Resource = [aws_kms_key.artefacts.arn]
      }
    ]
  })
}

output "s3_bucket_name" { value = aws_s3_bucket.artefacts.id }
output "kms_key_arn"    { value = aws_kms_key.artefacts.arn }
output "kms_key_id"     { value = aws_kms_key.artefacts.key_id }
