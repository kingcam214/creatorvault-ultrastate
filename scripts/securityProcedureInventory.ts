import { readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

const guardNames = new Set([
  "kingProcedure",
  "ownerProcedure",
  "adminProcedure",
  "adminGuard",
  "ownerOnlyProcedure",
]);
function source(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true
  );
}
function rootIdentifier(expression: ts.Expression): string | null {
  let root = expression;
  while (ts.isCallExpression(root) || ts.isPropertyAccessExpression(root))
    root = root.expression;
  return ts.isIdentifier(root) ? root.text : null;
}
function propertyName(name: ts.PropertyName): string | null {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : null;
}
function objectArgument(
  expression: ts.Expression
): ts.ObjectLiteralExpression | null {
  return ts.isCallExpression(expression) &&
    rootIdentifier(expression) === "router" &&
    expression.arguments[0] &&
    ts.isObjectLiteralExpression(expression.arguments[0])
    ? expression.arguments[0]
    : null;
}

/** Resolve the canonical registry's imports, inline routers, exported router aliases, and nested paths. */
export function collectPrivilegedProcedurePaths(root: string): string[] {
  const result = new Set<string>();
  const visited = new Set<string>();
  function inspect(file: string, exportedName: string, prefix: string): void {
    const visitKey = `${file}:${exportedName}:${prefix}`;
    if (visited.has(visitKey)) return;
    visited.add(visitKey);
    const ast = source(file);
    const definitions = new Map<string, ts.Expression>();
    const imports = new Map<string, { file: string; name: string }>();
    for (const statement of ast.statements) {
      if (ts.isVariableStatement(statement))
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name) && declaration.initializer)
            definitions.set(declaration.name.text, declaration.initializer);
        }
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteral(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text.startsWith(".") &&
        statement.importClause?.namedBindings &&
        ts.isNamedImports(statement.importClause.namedBindings)
      ) {
        const target = path.resolve(
          path.dirname(file),
          statement.moduleSpecifier.text.replace(/\.js$/, "") + ".ts"
        );
        for (const entry of statement.importClause.namedBindings.elements)
          imports.set(entry.name.text, {
            file: target,
            name: entry.propertyName?.text ?? entry.name.text,
          });
      }
    }
    function walk(expression: ts.Expression, currentPrefix: string): void {
      const object = objectArgument(expression);
      if (object) {
        for (const property of object.properties) {
          if (!ts.isPropertyAssignment(property)) continue;
          const name = propertyName(property.name);
          if (!name) continue;
          const nextPrefix = currentPrefix ? `${currentPrefix}.${name}` : name;
          const guard = rootIdentifier(property.initializer);
          if (guard && guardNames.has(guard)) result.add(nextPrefix);
          else walk(property.initializer, nextPrefix);
        }
      } else if (ts.isIdentifier(expression)) {
        const imported = imports.get(expression.text);
        if (imported) inspect(imported.file, imported.name, currentPrefix);
        else {
          const declaration = definitions.get(expression.text);
          if (declaration) walk(declaration, currentPrefix);
        }
      }
    }
    const declaration = definitions.get(exportedName);
    if (declaration) walk(declaration, prefix);
  }
  inspect(path.join(root, "server", "routers.ts"), "appRouter", "");
  return [...result].sort();
}
