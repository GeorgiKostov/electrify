import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
test('every used Phosphor control has a declared glyph',()=>{
 const source=ts.createSourceFile('main.ts',readFileSync('src/main.ts','utf8'),ts.ScriptTarget.Latest,true),css=readFileSync('src/ui/icons.css','utf8'),names=new Set<string>();
 const collect=(node:ts.Node)=>{if(ts.isStringLiteral(node))names.add(node.text);else if(ts.isConditionalExpression(node)){collect(node.whenTrue);collect(node.whenFalse)}};
 function visit(node:ts.Node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){if(node.expression.text==='icon'&&node.arguments[0])collect(node.arguments[0]);if(node.expression.text==='button'&&node.arguments[2])collect(node.arguments[2])}if(ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='toolInfo'&&node.initializer&&ts.isObjectLiteralExpression(node.initializer))for(const prop of node.initializer.properties)if(ts.isPropertyAssignment(prop)&&ts.isArrayLiteralExpression(prop.initializer)&&prop.initializer.elements[1])collect(prop.initializer.elements[1]);ts.forEachChild(node,visit)}visit(source);
 for(const name of names)assert.ok(css.includes(`.ph.ph-${name}:before`),`missing ${name}`);
 assert.ok(names.size>30);
});
