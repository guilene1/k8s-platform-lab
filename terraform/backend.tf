# State is stored locally by default (terraform.tfstate, gitignored).
#
# To keep state in S3 instead, create a bucket in your own account, then
# uncomment the block below and run `terraform init -migrate-state`.
# `use_lockfile` uses S3-native locking (no DynamoDB table needed).
#
# terraform {
#   backend "s3" {
#     bucket       = "my-k8s-lab-tfstate-<random-suffix>"
#     key          = "k8s-platform-lab/terraform.tfstate"
#     region       = "us-east-1"
#     encrypt      = true
#     use_lockfile = true
#   }
# }
