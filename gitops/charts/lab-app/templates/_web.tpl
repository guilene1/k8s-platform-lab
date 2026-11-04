{{/* The frontend tier: static SPA on unprivileged nginx, proxying /api. */}}
{{- define "lab-app.web" -}}
{{- $name := include "lab-app.name" . -}}
{{- $ctx := dict "root" . "component" "web" "version" (include "lab-app.tag" (dict "root" . "component" "web")) -}}
{{- $web := .Values.web -}}
# Where the frontend's nginx sends /api/ requests.
apiVersion: v1
kind: ConfigMap
metadata:
  name: {{ $name }}-web-config
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
data:
  API_UPSTREAM: {{ include "lab-app.apiUrl" . | quote }}
  CLIENT_MAX_BODY_SIZE: {{ $web.clientMaxBodySize | quote }}
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ $name }}-web
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  {{- if not $web.hpa.enabled }}
  replicas: {{ $web.replicas }}
  {{- end }}
  revisionHistoryLimit: 5
  selector:
    matchLabels:
      {{- include "lab-app.selector" $ctx | nindent 6 }}
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  template:
    metadata:
      labels:
        {{- include "lab-app.labels" $ctx | nindent 8 }}
      annotations:
        # Roll the pods when the ConfigMap changes (nginx reads it at start).
        checksum/config: {{ printf "%s|%v" (include "lab-app.apiUrl" .) $web.clientMaxBodySize | sha256sum | trunc 16 }}
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
        runAsGroup: 101
        fsGroup: 101
        seccompProfile:
          type: RuntimeDefault
      terminationGracePeriodSeconds: 20
      {{- include "lab-app.spread" $ctx | nindent 6 }}
      containers:
        - name: web
          image: {{ include "lab-app.image" $ctx }}
          imagePullPolicy: IfNotPresent
          ports:
            - name: http
              containerPort: 8080
          envFrom:
            - configMapRef:
                name: {{ $name }}-web-config
          livenessProbe:
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 5
            timeoutSeconds: 2
            failureThreshold: 2
          lifecycle:
            # Keep serving while the ALB deregisters this pod.
            preStop:
              sleep:
                seconds: 5
          resources:
            {{- toYaml $web.resources | nindent 12 }}
          securityContext:
            {{- include "lab-app.containerSecurity" . | nindent 12 }}
          volumeMounts:
            - name: tmp
              mountPath: /tmp
            - name: nginx-conf
              mountPath: /etc/nginx/conf.d
      volumes:
        - name: tmp
          emptyDir:
            sizeLimit: 64Mi
        # Rendered config is written here at startup (read-only root fs).
        - name: nginx-conf
          emptyDir:
            sizeLimit: 1Mi
---
apiVersion: v1
kind: Service
metadata:
  name: {{ $name }}-web
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  type: ClusterIP
  selector:
    {{- include "lab-app.selector" $ctx | nindent 4 }}
  ports:
    - name: http
      port: 80
      targetPort: http
{{- if $web.hpa.enabled }}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {{ $name }}-web
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {{ $name }}-web
  minReplicas: {{ $web.hpa.minReplicas }}
  maxReplicas: {{ $web.hpa.maxReplicas }}
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: {{ $web.hpa.cpuUtilization }}
{{- end }}
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: {{ $name }}-web
  labels:
    {{- include "lab-app.labels" $ctx | nindent 4 }}
spec:
  minAvailable: 1
  selector:
    matchLabels:
      {{- include "lab-app.selector" $ctx | nindent 6 }}
{{- end -}}
