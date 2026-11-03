terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.71"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 3.3"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.9"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.3"
    }
    time = {
      source  = "hashicorp/time"
      version = "~> 0.14"
    }
  }
}
