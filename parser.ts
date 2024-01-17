import { AstLet, make_let, AstIf, make_if, AstFun, make_fun, AstApply, AstVar, AstExpr, make_apply, AstConst, make_const, make_var } from "./ast.ts";

export default class Parser {
	index: number;

	constructor(readonly input: String) {
		this.index = 0;
	}

	eof(): boolean {
		return this.index >= this.input.length;
	}

	isWhitespace(c: string): boolean {
		return c == " " || c == "\n" || c == "\t"
	}

	isSeparator(c: string): boolean {
		return this.isWhitespace(c) || c == "(" || c == ")"
	}

	isDigit(c: string): boolean {
		return c >= '0' && c <= '9';
	}

	eat() { return this.input[this.index++]; }
	match(c: string) {
		this.skipWhitespace()
		const eaten = this.eat()
		if (eaten !== c) throw new Error(`Expected '${c}', got '${eaten}': ${this.input.slice(this.index)}`)

		return eaten;
	}

	eatWhile(pred: (c: string) => boolean) 
	{ 
		let retval = ""

		while (!this.eof() && pred(this.peek())) 
		{
			retval += this.eat()	
		}

		return retval;
	}

	eatWord() {
		this.skipWhitespace()
		return this.eatWhile(c => !this.isSeparator(c));
	}

	matchWord(word: string) {
		this.skipWhitespace()
		const eaten = this.eatWord()
		if (eaten !== word) throw new Error(`Expected '${word}', got '${eaten}': ${this.input.slice(this.index)}`)

		return eaten;
	}

	skipWhitespace() {
		this.eatWhile(this.isWhitespace)
	}

	peek() { return this.input[this.index]; }

	peekWord() {
		const oldIndex = this.index;
		this.skipWhitespace()
		const retval = this.eatWord();
		this.index = oldIndex;

		return retval;
	}

	parseLet(): AstLet {
		this.matchWord("let")
		const variable = this.parseVar()
		this.match("=")
		const value = this.parse()
		this.matchWord("in")
		const body = this.parse()
		this.matchWord("end")

		return make_let(variable, value, body);
	}

	parseIf(): AstIf {
		this.matchWord("if")
		const pred = this.parse()
		this.matchWord("then")
		const tPath = this.parse()
		this.matchWord("else")
		const fPath = this.parse()
		this.matchWord("end")

		return make_if(pred, tPath, fPath)
	}

	parseFun(): AstFun {
		this.matchWord("fun")
		const variable = this.parseVar()
		this.matchWord("->")
		const body = this.parse()
		this.matchWord("end")

		return make_fun(variable, body)
	}

	parseApply(): AstApply | AstVar {
		const variable = this.parseVar()

		const args: AstExpr[] = []

		while (this.peek() == "(") {
			this.match("(")
			args.push(this.parse())
			this.match(")")
		}

		if (args.length === 0) return variable //throw new Error("There must be at least one argument.");
		return args.reduce((app, arg) => make_apply(app, arg), variable) as AstApply
	}

	parseConst(): AstConst {
		this.skipWhitespace()

		const value = this.eatWord()
		if (value === "true" || value === "false") {
			return make_const(value === "true");
		}

		return make_const(parseInt(value));
	}

	parseVar(): AstVar {
		this.skipWhitespace()
		const name = this.eatWord()

		return make_var(name);
	}

	parse(): AstExpr {
		this.skipWhitespace()
		const elem = this.peekWord()

		switch (elem) {
			case "if": return this.parseIf()
			case "let": return this.parseLet()
			case "fun": return this.parseFun()
			default: {
				if (this.isDigit(elem[0]) || elem === "true" || elem === "false") 
				{
					return this.parseConst()
				} else {
					return this.parseApply()
				}
			}
		}
	}
}
