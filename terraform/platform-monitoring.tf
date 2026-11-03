###############################################################################
# kube-prometheus-stack: Prometheus, Alertmanager, Grafana, node-exporter,
# kube-state-metrics.
#
# No EBS in this lab, so Prometheus, Alertmanager and Grafana use emptyDir:
# metrics history resets if those pods restart. Dashboards and alert rules are
# provisioned from this repo, so no configuration is lost.
###############################################################################

resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "92.17.1"
  namespace  = "monitoring" # created by platform-config (with the Grafana admin secret)

  values = [yamlencode({
    # EKS runs the control plane for us; these endpoints are not scrapeable,
    # so their rules would only produce false alerts.
    kubeControllerManager = { enabled = false }
    kubeScheduler         = { enabled = false }
    kubeEtcd              = { enabled = false }
    kubeProxy             = { enabled = false }

    prometheus = {
      prometheusSpec = {
        retention = "2d"
        # Pick up ServiceMonitors/PodMonitors/rules from every namespace,
        # including the app namespaces and students' own.
        serviceMonitorSelectorNilUsesHelmValues = false
        podMonitorSelectorNilUsesHelmValues     = false
        ruleSelectorNilUsesHelmValues           = false
        probeSelectorNilUsesHelmValues          = false
        scrapeConfigSelectorNilUsesHelmValues   = false
        resources = {
          requests = { cpu = "200m", memory = "1Gi" }
          limits   = { memory = "3Gi" }
        }
        # storageSpec intentionally unset -> emptyDir
      }
    }

    alertmanager = {
      alertmanagerSpec = {
        resources = {
          requests = { cpu = "10m", memory = "64Mi" }
          limits   = { memory = "256Mi" }
        }
      }
    }

    grafana = {
      admin = {
        existingSecret = "grafana-admin"
        userKey        = "admin-user"
        passwordKey    = "admin-password"
      }
      serviceAccount = {
        create = true
        name   = "kube-prometheus-stack-grafana" # bound to its Pod Identity role
      }
      persistence = { enabled = false }
      "grafana.ini" = {
        server = {
          root_url = "https://${local.platform_hosts.grafana}"
        }
      }
      sidecar = {
        dashboards = {
          enabled          = true
          label            = "grafana_dashboard"
          labelValue       = "1"
          searchNamespace  = "ALL"
          folderAnnotation = "grafana_folder"
          provider = {
            foldersFromFilesStructure = true
          }
        }
      }
      additionalDataSources = [{
        name     = "CloudWatch"
        uid      = "cloudwatch"
        type     = "cloudwatch"
        access   = "proxy"
        jsonData = { authType = "default", defaultRegion = var.region }
      }]
      resources = {
        requests = { cpu = "50m", memory = "192Mi" }
        limits   = { memory = "512Mi" }
      }
    }
  })]

  wait    = true
  timeout = 900

  depends_on = [
    helm_release.platform_config, # namespace + grafana-admin secret
    module.pod_identity_grafana,
  ]
}
