// Test file to verify worker performance
export interface TestInterface {
    id: string;
    name: string;
    data: any[];
}

export class TestClass implements TestInterface {
    constructor(
        public id: string,
        public name: string,
        public data: any[] = [],
    ) {}

    processData<T>(input: T[]): T[] {
        return input.map(item => ({ ...item, processed: true }));
    }

    async asyncOperation(): Promise<TestInterface> {
        return new Promise(resolve => {
            setTimeout(() => {
                resolve({
                    id: this.id,
                    name: this.name,
                    data: this.data,
                });
            }, 100);
        });
    }
}

// Complex generic types to test type checker
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function createInstance<T extends TestInterface>(
    data: DeepPartial<T>,
): T {
    return data as T;
}
