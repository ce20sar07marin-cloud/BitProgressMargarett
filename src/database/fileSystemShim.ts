export const Paths = {
  document: "/document",
  cache: "/cache",
};

export class Directory {
  exists = false;
  constructor(public parent: string, public name: string) {}
  async create() {}
}

export class File {
  exists = false;
  size = 0;
  constructor(public parent: any, public name?: string) {}
  async delete() {}
  async copy(target: any, options?: any) {}
}
