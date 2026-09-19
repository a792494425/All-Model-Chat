import { describe, expect, it } from 'vitest';
import { stripTypeScriptTypes } from './typeStripper';

describe('stripTypeScriptTypes', () => {
  it('leaves standard JavaScript untouched', () => {
    const code = `
      const a = 1;
      const b = 2;
      console.log(a + b);
      return a + b;
    `;
    expect(stripTypeScriptTypes(code).trim()).toBe(code.trim());
  });

  it('removes interface declarations', () => {
    const code = `
      interface User {
        name: string;
        age: number;
      }
      const user = { name: "Alice", age: 30 };
      return user.name;
    `;
    const stripped = stripTypeScriptTypes(code);
    expect(stripped).not.toContain('interface User');
    expect(stripped).toContain('const user = { name: "Alice", age: 30 };');
  });

  it('removes type alias declarations', () => {
    const code = `
      type ID = string | number;
      const id: ID = "user-123";
      return id;
    `;
    const stripped = stripTypeScriptTypes(code);
    expect(stripped).not.toContain('type ID =');
    expect(stripped).toContain('const id');
  });

  it('removes "as" type assertions', () => {
    const code = `
      const x = (value as string).toUpperCase();
      const obj = { foo: 'bar' } as const;
      return x;
    `;
    const stripped = stripTypeScriptTypes(code);
    expect(stripped).not.toContain('as string');
    expect(stripped).not.toContain('as const');
    expect(stripped).toContain('.toUpperCase()');
  });

  it('removes variable type annotations without breaking object literals or ternaries', () => {
    const code = `
      const count: number = 42;
      let name: string = 'Bob';
      const obj = { key: 'value', number: 100 };
      const res = count > 10 ? 'yes' : 'no';
      return { count, name, obj, res };
    `;
    const stripped = stripTypeScriptTypes(code);
    expect(stripped).toContain('const count = 42;');
    expect(stripped).toContain("let name = 'Bob';");
    expect(stripped).toContain("const obj = { key: 'value', number: 100 };");
    expect(stripped).toContain("const res = count > 10 ? 'yes' : 'no';");
  });

  it('removes function parameter and return type annotations', () => {
    const code = `
      function add(a: number, b: number): number {
        return a + b;
      }
      const multiply = (x: number, y: number): number => x * y;
      return add(2, 3) + multiply(4, 5);
    `;
    const stripped = stripTypeScriptTypes(code);
    expect(stripped).toContain('function add(a, b) {');
    expect(stripped).toContain('(x, y) => x * y');
  });
});
