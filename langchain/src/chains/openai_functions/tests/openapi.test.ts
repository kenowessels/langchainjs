import { test, expect } from "@jest/globals";

import { OpenAPIV3, OpenAPIV3_1 } from "openapi-types";
import {
  type JsonSchema7StringType,
  type JsonSchema7NumberType,
  type JsonSchema7ObjectType,
  type JsonSchema7ArrayType,
  type JsonSchema7Type,
} from "@langchain/core/utils/json_schema";
import { OpenAPISpec } from "../../../util/openapi.js";
import {
  convertOpenAPISchemaToJSONSchema,
  convertOpenAPIParamsToJSONSchema,
} from "../openapi.js";

test("Test convert OpenAPI schema to JSON Schema", async () => {
  const spec = new OpenAPISpec({
    openapi: "3.1.0",
    info: {
      title: "A fake spec for testing",
      version: "0.0.1",
    },
    paths: {
      "/widgets": {
        post: {
          operationId: "createWidget",
          description: "Create a widget",
          parameters: [
            {
              name: "stringParam",
              in: "query",
              schema: {
                type: "string",
              },
            },
            {
              name: "objectParam",
              in: "query",
              schema: {
                type: "object",
                properties: {
                  foo: {
                    type: "string",
                  },
                  bar: {
                    type: "number",
                  },
                },
              },
            },
            {
              name: "objectParamWithRequiredFields",
              in: "query",
              schema: {
                type: "object",
                required: ["fooRequired"],
                properties: {
                  fooRequired: {
                    type: "string",
                  },
                },
              },
            },
            {
              name: "stringArrayParam",
              in: "query",
              schema: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            {
              name: "nestedObjectInArrayParam",
              in: "query",
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    baz: {
                      type: "number",
                    },
                  },
                },
              },
            },
            {
              name: "nestedArrayInObjectParam",
              in: "query",
              schema: {
                type: "object",
                properties: {
                  qux: {
                    type: "array",
                    items: {
                      type: "string",
                    },
                  },
                },
              },
            },
            {
              name: "inceptionParam",
              in: "query",
              schema: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    nestedArray: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          nestedObject: {
                            type: "object",
                            properties: {
                              inception: {
                                type: "number",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          ],
          responses: {
            "200": {
              description: "OK",
              content: {
                "application/json": {
                  schema: {
                    properties: {
                      success: {
                        type: "boolean",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const createWidget = spec.getOperation(
    "/widgets",
    OpenAPIV3.HttpMethods.POST
  );
  expect(createWidget).not.toBeUndefined();
  if (!createWidget) {
    throw new Error(`Operation not found`);
  }

  function getParamSchema(
    operation: OpenAPIV3_1.OperationObject,
    paramName: string
  ) {
    const param = spec
      .getParametersForOperation(operation)
      .find((param) => param.name === paramName);
    if (!param) {
      throw new Error(`Param not found`);
    }
    if (!param.schema) {
      throw new Error(`Param schema not found`);
    }
    return spec.getSchema(param.schema);
  }

  type TypeMap = {
    string: JsonSchema7StringType;
    number: JsonSchema7NumberType;
    object: JsonSchema7ObjectType;
    array: JsonSchema7ArrayType;
  };

  function expectType<T extends keyof TypeMap>(
    type: T,
    schema: JsonSchema7Type | undefined
  ): TypeMap[T] {
    if (!schema || !("type" in schema)) {
      throw new Error(`Schema has no type`);
    }
    if (schema.type !== type) {
      throw new Error(`Unexpected type: ${schema.type}`);
    }
    return schema as TypeMap[T];
  }

  const stringParamSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "stringParam"),
    spec
  );
  expectType("string", stringParamSchema);

  const objectParamSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "objectParam"),
    spec
  );
  const typedObjectParamSchema = expectType("object", objectParamSchema);
  expectType("string", typedObjectParamSchema.properties.foo);
  expectType("number", typedObjectParamSchema.properties.bar);

  const objectParamWithRequiredFieldSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "objectParamWithRequiredFields"),
    spec
  ) as JsonSchema7ObjectType;
  expect(objectParamWithRequiredFieldSchema.required).toContain("fooRequired");

  const stringArrayParamSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "stringArrayParam"),
    spec
  );
  const typedStringArrayParamSchema = expectType(
    "array",
    stringArrayParamSchema
  );
  expect(typedStringArrayParamSchema.items).not.toBeUndefined();
  expectType("string", typedStringArrayParamSchema.items);

  const nestedObjectInArrayParamSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "nestedObjectInArrayParam"),
    spec
  );
  expectType(
    "number",
    expectType(
      "object",
      expectType("array", nestedObjectInArrayParamSchema).items
    ).properties.baz
  );

  const nestedArrayInObjectParamSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "nestedArrayInObjectParam"),
    spec
  );
  expectType(
    "string",
    expectType(
      "array",
      expectType("object", nestedArrayInObjectParamSchema).properties.qux
    ).items
  );

  const inceptionParamSchema = convertOpenAPISchemaToJSONSchema(
    getParamSchema(createWidget, "inceptionParam"),
    spec
  );
  expectType(
    "number",
    expectType(
      "object",
      expectType(
        "object",
        expectType(
          "array",
          expectType("object", expectType("array", inceptionParamSchema).items)
            .properties.nestedArray
        ).items
      ).properties.nestedObject
    ).properties.inception
  );
});

test("Test convert OpenAPI params to JSON Schema with new features", async () => {
  const spec = new OpenAPISpec({
    openapi: "3.1.0",
    info: {
      title: "A fake spec for testing",
      version: "0.0.1",
    },
    paths: {
      "/widgets": {
        post: {
          operationId: "createWidget",
          description: "Create a widget",
          parameters: [
            {
              name: "paramWithDescription",
              in: "query",
              description: "This is a description",
              schema: {
                type: "string",
              },
            },
            {
              name: "paramWithEnum",
              in: "query",
              schema: {
                type: "string",
                enum: ["a", "b", "c"],
              },
            },
            {
              name: "paramWithAnyOf",
              in: "query",
              schema: {
                anyOf: [{ type: "string" }, { type: "number" }],
              },
            },
            {
              name: "paramWithArrayOfAnyOf",
              in: "query",
              schema: {
                type: "array",
                items: {
                  anyOf: [{ type: "string" }, { type: "integer" }],
                },
              },
            },
          ],
          responses: {
            "200": {
              description: "OK",
            },
          },
        },
      },
    },
  });

  const operation = spec.getOperation("/widgets", OpenAPIV3.HttpMethods.POST);
  if (!operation) {
    throw new Error("Operation not found");
  }

  const jsonSchema = convertOpenAPIParamsToJSONSchema(
    spec.getParametersForOperation(operation),
    spec
  );

  // Test for description
  expect(jsonSchema.properties.paramWithDescription.description).toBe(
    "This is a description"
  );

  // Test for enum
  expect(jsonSchema.properties.paramWithEnum.enum).toEqual(["a", "b", "c"]);

  // Test for anyOf
  expect(jsonSchema.properties.paramWithAnyOf.anyOf).toHaveLength(2);
  expect(jsonSchema.properties.paramWithAnyOf.anyOf[0].type).toBe("string");
  expect(jsonSchema.properties.paramWithAnyOf.anyOf[1].type).toBe("number");

  // Test for anyOf in array
  const arrayItems = (
    jsonSchema.properties.paramWithArrayOfAnyOf as JsonSchema7ArrayType
  ).items as JsonSchema7Type;
  expect(arrayItems.anyOf).toHaveLength(2);
  expect(arrayItems.anyOf[0].type).toBe("string");
  expect(arrayItems.anyOf[1].type).toBe("integer");
});
