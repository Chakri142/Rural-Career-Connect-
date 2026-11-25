FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /project
COPY pom.xml .
RUN mvn -q dependency:go-offline
COPY src src
RUN mvn -q -DskipTests package
FROM eclipse-temurin:21-jre
RUN useradd --system --create-home career
WORKDIR /app
COPY --from=build /project/target/rural-career-connect-1.0.0.jar /app/app.jar
USER career
EXPOSE 8080
ENTRYPOINT ["java","-jar","/app/app.jar"]
