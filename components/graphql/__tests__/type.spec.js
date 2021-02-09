import type from "../type"

import { shallowMount } from "@vue/test-utils"
import {GraphQLEnumType, GraphQLInputObjectType, GraphQLInterfaceType, GraphQLObjectType} from "graphql"

const gqlType = {
  name: "TestType",
  description: "TestDescription",
  getFields: () => [{ name: "field1" }, { name: "field2" }],
}

const factory = (props) =>
  shallowMount(type, {
    mocks: {
      $t: (text) => text,
    },
    propsData: { gqlTypes: [], ...props },
    stubs: ["field", "typelink"],
  })

describe("type", () => {
  test("mounts properly when props are passed", () => {
    const wrapper = factory({
      gqlType,
    })

    expect(wrapper).toBeTruthy()
  })

  test("title of the type is rendered properly", () => {
    const wrapper = factory({
      gqlType,
    })

    expect(wrapper.find(".type-title").text()).toEqual("TestType")
  })

  test("description of the type is rendered properly if present", () => {
    const wrapper = factory({
      gqlType,
    })

    expect(wrapper.find(".type-desc").text()).toEqual("TestDescription")
  })

  test("description of the type is not rendered if not present", () => {
    const wrapper = factory({
      gqlType: {
        ...gqlType,
        description: undefined,
      },
    })

    expect(wrapper.find(".type-desc").exists()).toEqual(false)
  })

  test("fields are not rendered if not present", () => {
    const wrapper = factory({
      gqlType: {
        ...gqlType,
        getFields: undefined,
      },
    })
    expect(wrapper.find("field-stub").exists()).toEqual(false)
  })

  test("all fields are rendered if present with props passed properly", () => {
    const wrapper = factory({
      gqlType: {
        ...gqlType,
      },
    })

    expect(wrapper.findAll("field-stub").length).toEqual(2)
  })

  test("prepends 'input' to type name for Input Types", () => {
    const testType = new GraphQLInputObjectType({
      name: "TestType",
      fields: {}
    })

    const wrapper = factory({
      gqlType: testType 
    })

    expect(wrapper.find(".type-title").text().startsWith("input")).toEqual(true)
  })

  test("prepends 'interface' to type name for Interface Types", () => {
    const testType = new GraphQLInterfaceType({
      name: "TestType",
      fields: {}
    })

    const wrapper = factory({
      gqlType: testType
    })

    expect(wrapper.find(".type-title").text().startsWith("interface")).toEqual(true)
  })

  test("prepends 'enum' to type name for Enum Types", () => {
    const testType = new GraphQLEnumType({
      name: "TestType",
      values: {}
    })

    const wrapper = factory({
      gqlType: testType
    })

    expect(wrapper.find(".type-title").text().startsWith("enum")).toEqual(true)
  })

  test("'interfaces' computed property returns all the related interfaces", () => {
    const testInterfaceA = new GraphQLInterfaceType({
      name: "TestInterfaceA",
      fields: {}
    })
    const testInterfaceB = new GraphQLInterfaceType({
      name: "TestInterfaceB",
      fields: {}
    })

    const type = new GraphQLObjectType({
      name: "TestType",
      interfaces: [testInterfaceA, testInterfaceB],
      fields: {}
    })

    const wrapper = factory({
      gqlType: type
    })

    expect(wrapper.vm.interfaces).toEqual(expect.arrayContaining([testInterfaceA, testInterfaceB]))
  })

  test("'interfaces' computed property returns an empty array if there are no interfaces", () => {
    const type = new GraphQLObjectType({
      name: "TestType",
      fields: {}
    })

    const wrapper = factory({
      gqlType: type
    })

    expect(wrapper.vm.interfaces).toEqual([])
  })

  test("'interfaces' computed property returns an empty array if the type is an enum", () => {
    const type = new GraphQLEnumType({
      name: "TestType",
      values: {}
    })

    const wrapper = factory({
      gqlType: type
    })

    expect(wrapper.vm.interfaces).toEqual([])
  })

  test("'children' computed property returns all the types implementing an interface", () => {
    const testInterface = new GraphQLInterfaceType({
      name: "TestInterface",
      fields: {}
    })

    const typeA = new GraphQLObjectType({
      name: "TypeA",
      interfaces: [testInterface],
      fields: {}
    })

    const typeB = new GraphQLObjectType({
      name: "TypeB",
      interfaces: [testInterface],
      fields: {}
    })

    const wrapper = factory({
      gqlType: testInterface,
      gqlTypes: [testInterface, typeA, typeB]
    })

    expect(wrapper.vm.children).toEqual(expect.arrayContaining([typeA, typeB]))
  })

  test("'children' computed property returns an empty array if there are no types implementing the interface", () => {
    const testInterface = new GraphQLInterfaceType({
      name: "TestInterface",
      fields: {}
    })

    const typeA = new GraphQLObjectType({
      name: "TypeA",
      fields: {}
    })

    const typeB = new GraphQLObjectType({
      name: "TypeB",
      fields: {}
    })

    const wrapper = factory({
      gqlType: testInterface,
      gqlTypes: [testInterface, typeA, typeB]
    })

    expect(wrapper.vm.children).toEqual([])
  })

  test("'children' computed property returns an empty array if the type is an enum", () => {
    const testInterface = new GraphQLInterfaceType({
      name: "TestInterface",
      fields: {}
    })

    const testType = new GraphQLEnumType({
      name: "TestEnum",
      values: {}
    })

    const wrapper = factory({
      gqlType: testType,
      gqlTypes: [testInterface, testType]
    })

    expect(wrapper.vm.children).toEqual([])
  })

})
