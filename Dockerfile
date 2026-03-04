FROM node:22-alpine AS frontend-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY my-app-2/package.json my-app-2/package-lock.json ./my-app-2/
RUN npm --prefix my-app-2 ci

COPY my-app-2 ./my-app-2

ARG EXPO_PUBLIC_GOOGLE_CLIENT_ID=
ARG EXPO_PUBLIC_API_BASE_URL=
ENV EXPO_PUBLIC_GOOGLE_CLIENT_ID=${EXPO_PUBLIC_GOOGLE_CLIENT_ID}
ENV EXPO_PUBLIC_API_BASE_URL=${EXPO_PUBLIC_API_BASE_URL}

RUN cd my-app-2 && npx expo export --platform web

FROM node:22-alpine AS backend-runtime

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package-lock.json ./backend/
RUN npm --prefix backend ci --omit=dev

COPY backend ./backend
COPY --from=frontend-build /app/my-app-2/dist /app/my-app-2/dist

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 4000

CMD ["npm", "run", "start"]
