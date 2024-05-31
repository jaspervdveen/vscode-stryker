# Mutation testing report schema

* Status: accepted
* Deciders: Jasper van der Veen
* Date: 30-05-2024

## Decision Outcome
It has been decided to use the types of the open source [mutation testing report schema](https://github.com/stryker-mutator/mutation-testing-elements/tree/master/packages/report-schema) for all mutation testing related types within the Mutation Server Protocol, such as a mutation test result type. This decision ensures consistency and interoperability across the frameworks that implement this schema.

## Decision Rationale 
The types in this JSON schema are used by all three Stryker frameworks. Using this standardized schema facilitates easy integration with the Stryker-frameworks and other mutation testing frameworks that use this schema. 

## Consequences
The project now depends on the mutation-testing-report-schema package. This dependency introduces a reliance on the maintenance and updates of the schema provided by the Stryker team. However, this is mitigated by the active development behind the Stryker project.