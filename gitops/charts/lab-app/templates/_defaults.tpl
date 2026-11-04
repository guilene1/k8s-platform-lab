{{/* Defaults for every app. An app's values.yaml only sets what differs;
     "lab-app.render" deep-merges the app's values over these. */}}
{{- define "lab-app.defaultValues" -}}
app:
  name: ""
  host: ""
api:
  port: 8080
  replicas: 2
  dbPoolMax: 4
  env: {}
  resources:
    requests: { cpu: 50m, memory: 128Mi }
    limits: { memory: 320Mi }
  hpa:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    cpuUtilization: 70
web:
  replicas: 2
  clientMaxBodySize: 1m
  resources:
    requests: { cpu: 20m, memory: 32Mi }
    limits: { memory: 128Mi }
  hpa:
    enabled: true
    minReplicas: 2
    maxReplicas: 4
    cpuUtilization: 70
secrets:
  # How often External Secrets re-reads Secrets Manager.
  refreshInterval: 1m
storage:
  enabled: false
  storageClassName: efs-sc
  size: 5Gi
  mountPath: /data/uploads
global: {}
{{- end -}}

{{/* Entry point used by each app chart:  {{ include "lab-app.render" . }} */}}
{{- define "lab-app.render" -}}
{{- $values := mustMergeOverwrite (fromYaml (include "lab-app.defaultValues" .)) (deepCopy .Values) -}}
{{- include "lab-app.all" (dict "Values" $values "Release" .Release "Chart" .Chart "Capabilities" .Capabilities) -}}
{{- end -}}
