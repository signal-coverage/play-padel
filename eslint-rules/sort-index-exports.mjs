/**
 * Sorts `export * as name from "..."` declarations alphabetically by the
 * exported alias. Unlike `perfectionist/sort-exports`, which sorts by the
 * module source path, this compares the actual identifier consumers import
 * (e.g. `court`, `courtSideLeftSelected`), which is what an alphabetically
 * ordered barrel file should be judged by.
 */
const rule = {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      outOfOrder:
        'Export "{{name}}" is not in alphabetical order. Expected order: {{expected}}.',
    },
  },
  create(context) {
    return {
      Program(program) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const targets = program.body.filter(
          (node) => node.type === "ExportAllDeclaration" && node.exported,
        );

        if (targets.length < 2) return;

        const sorted = [...targets].sort((a, b) =>
          a.exported.name.localeCompare(b.exported.name),
        );

        const isSorted = targets.every((node, i) => node === sorted[i]);
        if (isSorted) return;

        context.report({
          node: targets[0],
          messageId: "outOfOrder",
          data: {
            name: targets[0].exported.name,
            expected: sorted.map((node) => node.exported.name).join(", "),
          },
          fix(fixer) {
            return targets.map((node, i) =>
              fixer.replaceTextRange(node.range, sourceCode.getText(sorted[i])),
            );
          },
        });
      },
    };
  },
};

export default {
  rules: {
    "sort-index-exports": rule,
  },
};
