module.exports = {
    transform: {
        "^.+\\.tsx?$": "ts-jest",
    },
    testRegex: "(/__tests__/.*|(\\.|/)(test))\\.(jsx?|tsx?)$",
    testPathIgnorePatterns: [
        "/dist/",
        "/node_modules/",
        "/<node_internals>/internal/util.js"
    ],
    moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/{!(index|\\w+Config|my-server-framework),}.ts",
        "!src/entities/*"
    ]
};
