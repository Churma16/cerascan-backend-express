export const customAlphabet = (alphabet: string, defaultSize: number = 21) => {
    return (size: number = defaultSize): string => {
        let generatedResult = "";
        for (let characterIndex = 0; characterIndex < size; characterIndex++) {
            const randomIndex = Math.floor(Math.random() * alphabet.length);
            generatedResult += alphabet[randomIndex];
        }
        return generatedResult;
    };
};

export const nanoid = customAlphabet(
    "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzict",
    21
);
