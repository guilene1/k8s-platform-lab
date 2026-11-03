output "app_urls" {
  description = "The 10 lab applications (live once Argo CD has synced them, usually a few minutes after apply)."
  value = {
    for name, app in local.apps : app.title => "https://${app.host}.${var.domain_name}"
  }
}

output "argocd_url" {
  description = "Argo CD UI (user: admin)."
  value       = "https://${local.platform_hosts.argocd}"
}

output "argocd_admin_password_command" {
  description = "Prints the initial Argo CD admin password."
  value       = "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d; echo"
}

output "grafana_url" {
  description = "Grafana UI (user: admin)."
  value       = "https://${local.platform_hosts.grafana}"
}

output "grafana_admin_password" {
  description = "Grafana admin password (from Secrets Manager). Show it with: terraform output -raw grafana_admin_password"
  value       = random_password.grafana_admin.result
  sensitive   = true
}

output "kubeconfig_command" {
  description = "Configures kubectl for the lab cluster (cluster-admin)."
  value       = "aws eks update-kubeconfig --name ${module.eks.cluster_name} --region ${var.region}"
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "region" {
  value = var.region
}

output "efs_file_system_id" {
  value = aws_efs_file_system.this.id
}

output "rds_endpoint" {
  description = "Private RDS endpoint (reachable only from inside the VPC)."
  value       = aws_db_instance.this.address
}

output "ecr_registry" {
  value = "${local.ecr_registry}/${local.name}"
}

output "gitops_repo" {
  value = "${var.gitops_repo_url}@${var.gitops_revision}"
}
