import org.gradle.external.javadoc.StandardJavadocDocletOptions

plugins {
    `java-library`
    `maven-publish`
    signing
}

group = "dev.makrell"
version = "0.10.0"

val releaseVersion = version.toString()
val isSnapshot = releaseVersion.endsWith("-SNAPSHOT")
val centralUsername = providers.gradleProperty("mavenCentralUsername")
    .orElse(providers.environmentVariable("MAVEN_CENTRAL_USERNAME"))
val centralPassword = providers.gradleProperty("mavenCentralPassword")
    .orElse(providers.environmentVariable("MAVEN_CENTRAL_PASSWORD"))
val signingKey = providers.gradleProperty("signingInMemoryKey")
    .orElse(providers.environmentVariable("SIGNING_IN_MEMORY_KEY"))
val signingPassword = providers.gradleProperty("signingInMemoryKeyPassword")
    .orElse(providers.environmentVariable("SIGNING_IN_MEMORY_KEY_PASSWORD"))

java {
    toolchain {
        languageVersion.set(JavaLanguageVersion.of(11))
    }
    withSourcesJar()
    withJavadocJar()
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.2")
}

tasks.test {
    useJUnitPlatform()
}

tasks.withType<Javadoc>().configureEach {
    (options as StandardJavadocDocletOptions).addStringOption("Xdoclint:none", "-quiet")
    options.encoding = "UTF-8"
}

publishing {
    publications {
        create<MavenPublication>("mavenJava") {
            artifactId = "makrell-formats"
            from(components["java"])
            pom {
                name.set("Makrell Formats")
                description.set("MRON, MRML, and MRTD support for the JVM track.")
                url.set("https://makrell.dev")
                licenses {
                    license {
                        name.set("MIT")
                        url.set("https://opensource.org/license/mit")
                    }
                }
                developers {
                    developer {
                        id.set("hcholm")
                        name.set("Hans-Christian Holm")
                        email.set("hchrholm@online.no")
                    }
                }
                scm {
                    connection.set("scm:git:https://github.com/hcholm/makrell.git")
                    developerConnection.set("scm:git:ssh://git@github.com/hcholm/makrell.git")
                    url.set("https://github.com/hcholm/makrell")
                }
            }
        }
    }
    repositories {
        maven {
            name = "mavenCentral"
            url = uri(
                if (isSnapshot) {
                    "https://central.sonatype.com/repository/maven-snapshots/"
                } else {
                    "https://ossrh-staging-api.central.sonatype.com/service/local/staging/deploy/maven2/"
                }
            )
            credentials {
                username = centralUsername.orNull
                password = centralPassword.orNull
            }
        }
    }
}

signing {
    setRequired {
        !isSnapshot && gradle.startParameter.taskNames.any { taskName ->
            taskName.startsWith("publish") && !taskName.contains("MavenLocal")
        }
    }
    if (signingKey.isPresent) {
        useInMemoryPgpKeys(signingKey.get(), signingPassword.orNull)
    }
    sign(publishing.publications["mavenJava"])
}
