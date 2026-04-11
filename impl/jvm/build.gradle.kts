plugins {
    `java-library`
    `maven-publish`
}

group = "dev.makrell"
version = "0.1.0-alpha.1"

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

publishing {
    publications {
        create<MavenPublication>("mavenJava") {
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
            }
        }
    }
}
