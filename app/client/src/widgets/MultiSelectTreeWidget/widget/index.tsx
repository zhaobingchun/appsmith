import React, { ReactNode } from "react";
import BaseWidget, { WidgetProps, WidgetState } from "widgets/BaseWidget";
import { TextSize, WidgetType } from "constants/WidgetConstants";
import { EventType } from "constants/AppsmithActionConstants/ActionConstants";
import { isArray, find, xor, xorWith, isEqual, uniq } from "lodash";
import {
  ValidationResponse,
  ValidationTypes,
} from "constants/WidgetValidation";
import { EvaluationSubstitutionType } from "entities/DataTree/dataTreeFactory";
import { DefaultValueType } from "rc-select/lib/interface/generator";
import { Layers } from "constants/Layers";
import { CheckedStrategy } from "rc-tree-select/lib/utils/strategyUtil";
import { GRID_DENSITY_MIGRATION_V1, MinimumPopupRows } from "widgets/constants";
import { AutocompleteDataType } from "utils/autocomplete/TernServer";
import MultiTreeSelectComponent from "../component";
import { DropdownOption, LabelPosition } from "components/constants";
import { Alignment } from "@blueprintjs/core";
import { flattenOptions } from "widgets/WidgetUtils";

function defaultOptionValueValidation(value: unknown): ValidationResponse {
  let values: string[] = [];
  if (typeof value === "string") {
    try {
      values = JSON.parse(value);
      if (!Array.isArray(values)) {
        throw new Error();
      }
    } catch {
      values = value.length ? value.split(",") : [];
      if (values.length > 0) {
        values = values.map((_v: string) => _v.trim());
      }
    }
  }
  if (Array.isArray(value)) {
    values = Array.from(new Set(value));
  }

  return {
    isValid: true,
    parsed: values,
  };
}

export const getOptionSubTree = (
  options: DropdownOption[],
  value: string | number,
  mode: CheckedStrategy,
) => {
  let result: { label: string; value: string | number }[] = [];
  // Finds the target on the 1st level of the options tree
  const targetOption = find(options, { value }) as DropdownOption;
  if (targetOption) {
    result = result.concat({
      label: targetOption.label,
      value: targetOption.value,
    });
    if (mode === "SHOW_PARENT") {
      return result;
    }
    if (Array.isArray(targetOption.children)) {
      // If found, Finds all decendants for the found target
      if (mode === "SHOW_CHILD") {
        return flattenOptions(targetOption.children);
      }
      return result.concat(flattenOptions(targetOption.children));
    }
  }
  // Cannot find the target on the 1st level of the options tree
  // Until finding the target or reaching out the leaves, loops
  options.every((option) => {
    if (Array.isArray(option.children)) {
      // Finds the target from the children
      const optionSubTree = getOptionSubTree(option.children, value, mode);
      if (optionSubTree.length > 0) {
        result = result.concat(optionSubTree);
        return false;
      }
    }
    return true;
  });
  return result;
};
class MultiSelectTreeWidget extends BaseWidget<
  MultiSelectTreeWidgetProps,
  WidgetState
> {
  static getPropertyPaneConfig() {
    return [
      {
        sectionName: "General",
        children: [
          {
            helpText: "Mode to Display options",
            propertyName: "mode",
            label: "Mode",
            controlType: "DROP_DOWN",
            options: [
              {
                label: "Display only parent items",
                value: "SHOW_PARENT",
              },
              {
                label: "Display only child items",
                value: "SHOW_CHILD",
              },
              {
                label: "Display all items",
                value: "SHOW_ALL",
              },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            helpText:
              "Allows users to select multiple options. Values must be unique",
            propertyName: "options",
            label: "Options",
            controlType: "INPUT_TEXT",
            placeholderText: "Enter option value",
            isBindProperty: true,
            isTriggerProperty: false,
            isJSConvertible: false,
            validation: {
              type: ValidationTypes.NESTED_OBJECT_ARRAY,
              params: {
                unique: ["value"],
                default: [],
                children: {
                  type: ValidationTypes.OBJECT,
                  params: {
                    allowedKeys: [
                      {
                        name: "label",
                        type: ValidationTypes.TEXT,
                        params: {
                          default: "",
                          required: true,
                        },
                      },
                      {
                        name: "value",
                        type: ValidationTypes.TEXT,
                        params: {
                          default: "",
                        },
                      },
                      {
                        name: "children",
                        type: ValidationTypes.ARRAY,
                        required: false,
                        params: {
                          children: {
                            type: ValidationTypes.OBJECT,
                            params: {
                              allowedKeys: [
                                {
                                  name: "label",
                                  type: ValidationTypes.TEXT,
                                  params: {
                                    default: "",
                                    required: true,
                                  },
                                },
                                {
                                  name: "value",
                                  type: ValidationTypes.TEXT,
                                  params: {
                                    default: "",
                                  },
                                },
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              },
            },
            evaluationSubstitutionType:
              EvaluationSubstitutionType.SMART_SUBSTITUTE,
          },
          {
            helpText: "Selects the option with value by default",
            propertyName: "defaultOptionValue",
            label: "Default Value",
            controlType: "INPUT_TEXT",
            placeholderText: "Enter option value",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: {
              type: ValidationTypes.FUNCTION,
              params: {
                fn: defaultOptionValueValidation,
                expected: {
                  type: "Array of values",
                  example: `['value1', 'value2']`,
                  autocompleteDataType: AutocompleteDataType.ARRAY,
                },
              },
            },
          },
          {
            helpText: "Sets a Placeholder Text",
            propertyName: "placeholderText",
            label: "Placeholder",
            controlType: "INPUT_TEXT",
            placeholderText: "Enter placeholder text",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "isRequired",
            label: "Required",
            helpText: "Makes input to the widget mandatory",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            helpText: "Controls the visibility of the widget",
            propertyName: "isVisible",
            label: "Visible",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "isDisabled",
            label: "Disabled",
            helpText: "Disables input to this widget",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "animateLoading",
            label: "Animate Loading",
            controlType: "SWITCH",
            helpText: "Controls the loading of the widget",
            defaultValue: true,
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "allowClear",
            label: "Clear all Selections",
            helpText: "Enables Icon to clear all Selections",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
          {
            propertyName: "expandAll",
            label: "Expand all by default",
            helpText: "Expand All nested options",
            controlType: "SWITCH",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.BOOLEAN },
          },
        ],
      },
      {
        sectionName: "Label",
        children: [
          {
            helpText: "Sets the label text of the widget",
            propertyName: "labelText",
            label: "Text",
            controlType: "INPUT_TEXT",
            placeholderText: "Enter label text",
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: "Sets the label position of the widget",
            propertyName: "labelPosition",
            label: "Position",
            controlType: "DROP_DOWN",
            options: [
              { label: "Left", value: LabelPosition.Left },
              { label: "Top", value: LabelPosition.Top },
              { label: "Auto", value: LabelPosition.Auto },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            helpText: "Sets the label alignment of the widget",
            propertyName: "labelAlignment",
            label: "Alignment",
            controlType: "LABEL_ALIGNMENT_OPTIONS",
            options: [
              {
                icon: "LEFT_ALIGN",
                value: Alignment.LEFT,
              },
              {
                icon: "RIGHT_ALIGN",
                value: Alignment.RIGHT,
              },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
            hidden: (props: MultiSelectTreeWidgetProps) =>
              props.labelPosition !== LabelPosition.Left,
            dependencies: ["labelPosition"],
          },
          {
            helpText:
              "Sets the label width of the widget as the number of columns",
            propertyName: "labelWidth",
            label: "Width (in columns)",
            controlType: "NUMERIC_INPUT",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            min: 0,
            validation: {
              type: ValidationTypes.NUMBER,
              params: {
                natural: true,
              },
            },
            hidden: (props: MultiSelectTreeWidgetProps) =>
              props.labelPosition !== LabelPosition.Left,
            dependencies: ["labelPosition"],
          },
        ],
      },
      {
        sectionName: "Styles",
        children: [
          {
            propertyName: "labelTextColor",
            label: "Label Text Color",
            controlType: "COLOR_PICKER",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
          {
            propertyName: "labelTextSize",
            label: "Label Text Size",
            controlType: "DROP_DOWN",
            defaultValue: "PARAGRAPH",
            options: [
              {
                label: "Heading 1",
                value: "HEADING1",
                subText: "24px",
                icon: "HEADING_ONE",
              },
              {
                label: "Heading 2",
                value: "HEADING2",
                subText: "18px",
                icon: "HEADING_TWO",
              },
              {
                label: "Heading 3",
                value: "HEADING3",
                subText: "16px",
                icon: "HEADING_THREE",
              },
              {
                label: "Paragraph",
                value: "PARAGRAPH",
                subText: "14px",
                icon: "PARAGRAPH",
              },
              {
                label: "Paragraph 2",
                value: "PARAGRAPH2",
                subText: "12px",
                icon: "PARAGRAPH_TWO",
              },
            ],
            isBindProperty: false,
            isTriggerProperty: false,
          },
          {
            propertyName: "labelStyle",
            label: "Label Font Style",
            controlType: "BUTTON_TABS",
            options: [
              {
                icon: "BOLD_FONT",
                value: "BOLD",
              },
              {
                icon: "ITALICS_FONT",
                value: "ITALIC",
              },
            ],
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: false,
            validation: { type: ValidationTypes.TEXT },
          },
        ],
      },
      {
        sectionName: "Events",
        children: [
          {
            helpText: "Triggers an action when a user selects an option",
            propertyName: "onOptionChange",
            label: "onOptionChange",
            controlType: "ACTION_SELECTOR",
            isJSConvertible: true,
            isBindProperty: true,
            isTriggerProperty: true,
          },
        ],
      },
    ];
  }

  static getDerivedPropertiesMap() {
    return {
      selectedOptionLabels: `{{ this.selectedLabel }}`,
      selectedOptionValues:
        '{{ this.selectedOptionValueArr.filter((o) => JSON.stringify(this.options).match(new RegExp(`"value":"${o}"`, "g")) )}}',
      isValid: `{{ this.isRequired  ? this.selectedOptionValues?.length > 0 : true}}`,
      value: `{{this.selectedOptionValues}}`,
    };
  }

  static getDefaultPropertiesMap(): Record<string, string> {
    return {
      selectedOptionValueArr: "defaultOptionValue",
      selectedLabel: "defaultOptionValue",
    };
  }

  static getMetaPropertiesMap(): Record<string, any> {
    return {
      selectedOptionValueArr: undefined,
      selectedLabel: [],
      isDirty: false,
    };
  }

  componentDidMount() {
    // Sets selectedLabel
    this.setSelectedOptions(
      this.props.options,
      this.props.selectedOptionValueArr,
    );
  }

  componentDidUpdate(prevProps: MultiSelectTreeWidgetProps) {
    if (
      xor(this.props.defaultOptionValue, prevProps.defaultOptionValue).length >
      0
    ) {
      if (this.props.isDirty) {
        this.props.updateWidgetMetaProperty("isDirty", false);
      }
    }
    if (
      xorWith(
        flattenOptions(this.props.options),
        flattenOptions(prevProps.options),
        isEqual,
      ).length > 0
    ) {
      // Sets selectedLabel
      this.setSelectedOptions(
        this.props.options,
        this.props.selectedOptionValueArr,
      );
    }
    if (
      xor(this.props.selectedOptionValueArr, prevProps.selectedOptionValueArr)
        .length > 0 &&
      this.props.isDirty === false
    ) {
      // Sets selectedLabel
      this.setSelectedOptions(
        this.props.options,
        this.props.selectedOptionValueArr,
      );
    }
  }

  getPageView() {
    const options =
      isArray(this.props.options) &&
      !this.props.__evaluation__?.errors.options.length
        ? this.props.options
        : [];

    const values = isArray(this.props.selectedOptionValueArr)
      ? this.props.selectedOptionValueArr
      : [];

    const dropDownWidth = MinimumPopupRows * this.props.parentColumnSpace;
    const { componentWidth } = this.getComponentDimensions();
    const isInvalid =
      "isValid" in this.props && !this.props.isValid && !!this.props.isDirty;
    return (
      <MultiTreeSelectComponent
        allowClear={this.props.allowClear}
        compactMode={
          !(
            (this.props.bottomRow - this.props.topRow) /
              GRID_DENSITY_MIGRATION_V1 >
            1
          )
        }
        disabled={this.props.isDisabled ?? false}
        dropDownWidth={dropDownWidth}
        dropdownStyle={{
          zIndex: Layers.dropdownModalWidget,
        }}
        expandAll={this.props.expandAll}
        isFilterable
        isValid={!isInvalid}
        labelAlignment={this.props.labelAlignment}
        labelPosition={this.props.labelPosition}
        labelStyle={this.props.labelStyle}
        labelText={this.props.labelText}
        labelTextColor={this.props.labelTextColor}
        labelTextSize={this.props.labelTextSize}
        labelWidth={this.getLabelWidth()}
        loading={this.props.isLoading}
        mode={this.props.mode}
        onChange={this.onOptionChange}
        options={options}
        placeholder={this.props.placeholderText as string}
        value={values}
        widgetId={this.props.widgetId}
        width={componentWidth}
      />
    );
  }

  onOptionChange = (value?: DefaultValueType, labelList?: ReactNode[]) => {
    if (!this.props.isDirty) {
      this.props.updateWidgetMetaProperty("isDirty", true);
    }
    this.props.updateWidgetMetaProperty("selectedOptionValueArr", value);
    this.props.updateWidgetMetaProperty("selectedLabel", labelList, {
      triggerPropertyName: "onOptionChange",
      dynamicString: this.props.onOptionChange,
      event: {
        type: EventType.ON_OPTION_CHANGE,
      },
    });
    if (!this.props.isDirty) {
      this.props.updateWidgetMetaProperty("isDirty", true);
    }
  };

  setSelectedOptions(
    options: DropdownOption[],
    selectedValues: (string | number)[],
  ) {
    let selectedOptions: { label: string; value: string | number }[] = [];
    selectedValues.forEach((selectedValue) => {
      selectedOptions = selectedOptions.concat(
        getOptionSubTree(options, selectedValue, this.props.mode),
      );
    });

    // Here, _.uniq is just used to eliminate duplications produced by getOptionSubTree calculation
    const selectedOptionLabels = uniq(
      selectedOptions.map((option) => option.label),
    );
    const selectedOptionValues = uniq(
      selectedOptions.map((option) => option.value),
    );
    this.props.updateWidgetMetaProperty("selectedLabel", selectedOptionLabels);
    this.props.updateWidgetMetaProperty(
      "selectedOptionValueArr",
      selectedOptionValues,
    );
  }

  static getWidgetType(): WidgetType {
    return "MULTI_SELECT_TREE_WIDGET";
  }
}

export interface MultiSelectTreeWidgetProps extends WidgetProps {
  placeholderText?: string;
  selectedIndexArr?: number[];
  options: DropdownOption[];
  onOptionChange: string;
  defaultOptionValue: string[];
  isRequired: boolean;
  isLoading: boolean;
  allowClear: boolean;
  labelText: string;
  labelPosition?: LabelPosition;
  labelAlignment?: Alignment;
  labelWidth?: number;
  selectedLabel: string[];
  selectedOptionValueArr: string[];
  selectedOptionValues: string[];
  selectedOptionLabels: string[];
  expandAll: boolean;
  mode: CheckedStrategy;
  labelTextColor?: string;
  labelTextSize?: TextSize;
  labelStyle?: string;
  isDirty: boolean;
}

export default MultiSelectTreeWidget;
