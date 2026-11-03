###############################################################################
# Required: every student sets these in terraform.tfvars
###############################################################################

variable "domain_name" {
  description = "A domain you own whose Route 53 public hosted zone already exists in this AWS account (for example \"lab.example.com\"). Apps are served at <app>.<domain_name>. Terraform looks the zone up; it never creates or deletes it."
  type        = string

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}$", var.domain_name))
    error_message = "domain_name must be a lowercase DNS name without a trailing dot, e.g. \"lab.example.com\"."
  }
}

variable "gitops_repo_url" {
  description = "HTTPS URL of the git repository Argo CD syncs the apps from (your public fork of this repo), e.g. \"https://github.com/<you>/k8s-platform-lab.git\"."
  type        = string

  validation {
    condition     = can(regex("^https://", var.gitops_repo_url))
    error_message = "gitops_repo_url must be an https:// git URL."
  }
}

###############################################################################
# Optional
###############################################################################

variable "gitops_revision" {
  description = "Git branch, tag or commit Argo CD syncs."
  type        = string
  default     = "main"
}

variable "region" {
  description = "AWS region for every resource."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Short name used as the EKS cluster name and as a prefix for AWS resource names. Lowercase letters, digits and hyphens."
  type        = string
  default     = "k8slab"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,18}[a-z0-9]$", var.project_name))
    error_message = "project_name must be 3-20 chars: lowercase letters, digits, hyphens; start with a letter."
  }
}

variable "kubernetes_version" {
  description = "EKS Kubernetes version. Keep this on a version in EKS standard support (extended support costs 6x more per cluster hour)."
  type        = string
  default     = "1.37"
}

variable "vpc_cidr" {
  description = "CIDR block for the lab VPC. Split into 3 public and 3 private subnets."
  type        = string
  default     = "10.20.0.0/16"
}

variable "single_nat_gateway" {
  description = "true = one shared NAT gateway (cheaper, the lab default). false = one NAT gateway per AZ (production-style high availability, ~2x NAT cost)."
  type        = bool
  default     = true
}

variable "endpoint_public_access_cidrs" {
  description = "CIDRs allowed to reach the public EKS API endpoint. Narrow this to your own IP (x.x.x.x/32) if you like."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "cluster_admin_principal_arns" {
  description = "Extra IAM role/user ARNs that get cluster-admin (e.g. an instructor role). The identity running terraform is always admin."
  type        = list(string)
  default     = []
}

variable "node_architecture" {
  description = "CPU architecture of worker nodes and app images: \"arm64\" (Graviton, cheaper; default) or \"x86_64\". App images are built for this platform."
  type        = string
  default     = "arm64"

  validation {
    condition     = contains(["arm64", "x86_64"], var.node_architecture)
    error_message = "node_architecture must be \"arm64\" or \"x86_64\"."
  }
}

variable "node_instance_types" {
  description = "Instance types for the managed node group. Leave empty to use the default for node_architecture (m7g.xlarge for arm64, m7i.xlarge for x86_64). Must match node_architecture."
  type        = list(string)
  default     = []
}

variable "node_min_size" {
  description = "Minimum nodes in the managed node group (Cluster Autoscaler never scales below this)."
  type        = number
  default     = 3
}

variable "node_desired_size" {
  description = "Initial number of nodes. After creation, Cluster Autoscaler owns this value."
  type        = number
  default     = 3
}

variable "node_max_size" {
  description = "Maximum nodes Cluster Autoscaler may scale up to."
  type        = number
  default     = 6
}

variable "db_instance_class" {
  description = "RDS instance class for the shared PostgreSQL instance (10 app databases)."
  type        = string
  default     = "db.t4g.medium"
}

variable "db_engine_version" {
  description = "RDS for PostgreSQL major version. RDS picks the current default minor version and applies minor upgrades automatically."
  type        = string
  default     = "18"
}

variable "build_images" {
  description = "Build and push the 10 app images to ECR during apply (needs Docker running locally). Set false only if images are already in ECR."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Extra tags added to every AWS resource."
  type        = map(string)
  default     = {}
}
