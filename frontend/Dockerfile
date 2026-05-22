FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm config set strict-ssl false && npm ci

COPY . .

# API URL — empty string = use relative /api paths (nginx proxy, Docker deployment)
# Set to full URL only for Netlify/standalone deployments
ARG VITE_API_URL=""
ARG VITE_DD_APPLICATION_ID=""
ARG VITE_DD_CLIENT_TOKEN=""
ARG VITE_DD_SITE="us3.datadoghq.com"
ARG VITE_DD_ENV="staging"

ENV VITE_API_URL=$VITE_API_URL \
    VITE_DD_APPLICATION_ID=$VITE_DD_APPLICATION_ID \
    VITE_DD_CLIENT_TOKEN=$VITE_DD_CLIENT_TOKEN \
    VITE_DD_SITE=$VITE_DD_SITE \
    VITE_DD_ENV=$VITE_DD_ENV

RUN npm run build

FROM nginx:1.25-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.frontend.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
