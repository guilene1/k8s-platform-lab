{{/* How the app plugs into the platform: routing, secrets, storage. */}}
{{- define "lab-app.platform" -}}
{{- $name := include "lab-app.name" . -}}
{{- $g := .Values.global -}}
{{- $ctx := dict "root" . "component" "web" -}}
# https://<host>.<domain> -> the web Service, through the shared Gateway (ALB).
# external-dns sees the hostname and creates the Route 53 record.
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: {{ $name }}
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  parentRefs:
    - name: {{ $g.gateway.name }}
      namespace: {{ $g.gateway.namespace }}
      sectionName: https
  hostnames:
    - {{ include "lab-app.host" . | quote }}
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /
      backendRefs:
        - name: {{ $name }}-web
          port: 80
---
# ALB target group settings for the web Service: register pod IPs and
# health-check nginx's /healthz.
apiVersion: gateway.k8s.aws/v1
kind: TargetGroupConfiguration
metadata:
  name: {{ $name }}-web
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  targetReference:
    kind: Service
    name: {{ $name }}-web
  defaultConfiguration:
    targetType: ip
    healthCheckConfig:
      healthCheckPath: /healthz
      healthCheckInterval: 10
      healthyThresholdCount: 2
      unhealthyThresholdCount: 3
---
# Database credential: AWS Secrets Manager -> Kubernetes Secret "<app>-db".
# The secret value never appears in git; only its name does.
apiVersion: external-secrets.io/v1
kind: ExternalSecret
metadata:
  name: {{ $name }}-db
  labels:
    {{- include "lab-app.labels" (dict "root" . "component" "api") | nindent 4 }}
spec:
  refreshInterval: {{ .Values.secrets.refreshInterval }}
  secretStoreRef:
    kind: ClusterSecretStore
    name: {{ $g.secretStore }}
  target:
    name: {{ $name }}-db
    creationPolicy: Owner
  data:
    {{- range $key, $prop := dict "PGHOST" "host" "PGPORT" "port" "PGDATABASE" "dbname" "PGUSER" "username" "PGPASSWORD" "password" }}
    - secretKey: {{ $key }}
      remoteRef:
        key: {{ $g.secretPrefix }}/apps/{{ $name }}/db
        property: {{ $prop }}
    {{- end }}
{{- if .Values.storage.enabled }}
---
# Shared ReadWriteMany volume on Amazon EFS: every API replica mounts the
# same files, so an upload served by one pod is visible to all of them and
# survives pod restarts.
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: {{ $name }}-uploads
  labels:
    {{- include "lab-app.labels" (dict "root" . "component" "api") | nindent 4 }}
spec:
  accessModes: ["ReadWriteMany"]
  storageClassName: {{ .Values.storage.storageClassName }}
  resources:
    requests:
      storage: {{ .Values.storage.size }}
{{- end }}
{{- end -}}

{{/* Everything for one app. */}}
{{- define "lab-app.all" -}}
{{ include "lab-app.api" . }}
---
{{ include "lab-app.web" . }}
---
{{ include "lab-app.platform" . }}
{{- end -}}
