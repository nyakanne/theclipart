# ── SES domain identity + DKIM ───────────────────────────────────────────────
variable "email_domain"    { default = "dataguard.example.com" }
variable "ses_from_email"  { default = "noreply@dataguard.example.com" }

resource "aws_ses_domain_identity" "main" {
  domain = var.email_domain
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

resource "aws_ses_email_identity" "from" {
  email = var.ses_from_email
}

# Mailgun catch-all for honey-token inbound
resource "aws_ses_receipt_rule_set" "honey" {
  rule_set_name = "${var.project_name}-honey-token-rules"
}

resource "aws_ses_active_receipt_rule_set" "honey" {
  rule_set_name = aws_ses_receipt_rule_set.honey.rule_set_name
}

resource "aws_ses_receipt_rule" "honey_catch_all" {
  name          = "honey-token-catch-all"
  rule_set_name = aws_ses_receipt_rule_set.honey.rule_set_name
  recipients    = ["honey.dataguard.example.com"]
  enabled       = true
  scan_enabled  = true

  s3_action {
    bucket_name = aws_s3_bucket.artefacts.id
    object_key_prefix = "honey-inbound/"
    position    = 1
  }

  lambda_action {
    function_arn    = aws_lambda_function.honey_token_notifier.arn
    invocation_type = "Event"
    position        = 2
  }

  depends_on = [aws_s3_bucket_policy.ses_inbound]
}

resource "aws_s3_bucket_policy" "ses_inbound" {
  bucket = aws_s3_bucket.artefacts.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "AllowSESPuts"
      Effect = "Allow"
      Principal = { Service = "ses.amazonaws.com" }
      Action   = "s3:PutObject"
      Resource = "${aws_s3_bucket.artefacts.arn}/honey-inbound/*"
      Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
    }]
  })
}

data "aws_caller_identity" "current" {}

# Minimal Lambda stub — replace body with your actual handler
resource "aws_lambda_function" "honey_token_notifier" {
  filename         = "${path.module}/honey_notifier.zip"
  function_name    = "${var.project_name}-honey-notifier"
  role             = aws_iam_role.lambda_honey.arn
  handler          = "handler.lambda_handler"
  runtime          = "python3.12"
  timeout          = 30

  environment {
    variables = {
      DATAGUARD_API_URL = "https://${var.email_domain}/api/v1/webhooks/ses/honey"
    }
  }
}

resource "aws_iam_role" "lambda_honey" {
  name = "${var.project_name}-lambda-honey"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_honey_basic" {
  role       = aws_iam_role.lambda_honey.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

output "ses_domain"       { value = aws_ses_domain_identity.main.domain }
output "dkim_tokens"      { value = aws_ses_domain_dkim.main.dkim_tokens }
