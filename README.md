# Kubernetes Platform Lab

A production-style Amazon EKS platform built with one `terraform apply`: Gateway API on an AWS Application Load Balancer, Argo CD GitOps, EFS shared storage, External Secrets, external-dns, autoscaling, and Prometheus/Grafana. Ten real applications run on top of it.

> **Status:** under construction. Phase 1 (platform) is in place; the apps and full docs follow.

## Layout

| Path | What it is |
|---|---|
| `terraform/` | AWS infrastructure + every platform component (root module) |
| `terraform/charts/` | Small local Helm charts Terraform installs (Gateway, StorageClass, Argo CD bootstrap…) |
| `gitops/root/` | The Argo CD app-of-apps chart |
| `scripts/validate.sh` | Renders every chart and validates it against Kubernetes 1.37 (strict) |
# k8s-platform-lab
