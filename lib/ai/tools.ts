import { z } from "zod";

export const toolDefinitions = {
  updateMonthlyPlan: {
    description: "Update monthly planning parameters like NUU, Budget, or ARPDAU for a specific month.",
    parameters: z.object({
      monthIndex: z.number().describe("The index of the month (1 for M1, 2 for M2, etc.)"),
      field: z.enum(["nuu", "marketing", "arpdau", "ecpa"]).describe("The field to update"),
      value: z.number().describe("The new value"),
    }),
  },
  updateRetention: {
    description: "Update the retention curve anchors.",
    parameters: z.object({
      day: z.number().describe("The day index (1, 3, 7, 14, 30, etc.)"),
      value: z.number().describe("The retention rate value (0-100)"),
    }),
  },
  applyPreset: {
    description: "Apply a standard industry benchmark retention model.",
    parameters: z.object({
      modelId: z.enum(["A", "B", "C", "D", "E", "F"]).describe("The ID of the model (A=SLG High, B=RPG, etc.)"),
    }),
  },
};