// Simple Matrix Library
class Matrix {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.data = Array(this.rows).fill().map(() => Array(this.cols).fill(0));
    }

    static fromArray(arr) {
        let m = new Matrix(arr.length, 1);
        for (let i = 0; i < arr.length; i++) {
            m.data[i][0] = arr[i];
        }
        return m;
    }

    toArray() {
        let arr = [];
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                arr.push(this.data[i][j]);
            }
        }
        return arr;
    }

    randomize() {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = Math.random() * 2 - 1;
            }
        }
    }

    add(n) {
        if (n instanceof Matrix) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] += n.data[i][j];
                }
            }
        } else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] += n;
                }
            }
        }
    }

    static subtract(a, b) {
        let result = new Matrix(a.rows, a.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                result.data[i][j] = a.data[i][j] - b.data[i][j];
            }
        }
        return result;
    }

    static multiply(a, b) {
        if (a.cols !== b.rows) {
            console.error('Columns of A must match rows of B.');
            return undefined;
        }
        let result = new Matrix(a.rows, b.cols);
        for (let i = 0; i < result.rows; i++) {
            for (let j = 0; j < result.cols; j++) {
                let sum = 0;
                for (let k = 0; k < a.cols; k++) {
                    sum += a.data[i][k] * b.data[k][j];
                }
                result.data[i][j] = sum;
            }
        }
        return result;
    }

    multiply(n) {
        if (n instanceof Matrix) {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] *= n.data[i][j];
                }
            }
        } else {
            for (let i = 0; i < this.rows; i++) {
                for (let j = 0; j < this.cols; j++) {
                    this.data[i][j] *= n;
                }
            }
        }
    }

    map(func) {
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.data[i][j] = func(this.data[i][j]);
            }
        }
    }

    static map(matrix, func) {
        let result = new Matrix(matrix.rows, matrix.cols);
        for (let i = 0; i < matrix.rows; i++) {
            for (let j = 0; j < matrix.cols; j++) {
                result.data[i][j] = func(matrix.data[i][j]);
            }
        }
        return result;
    }

    print() {
        console.table(this.data);
    }

    copy() {
        let m = new Matrix(this.rows, this.cols);
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                m.data[i][j] = this.data[i][j];
            }
        }
        return m;
    }
}

class NeuralNetwork {
    constructor(input_nodes, hidden_nodes, output_nodes) {
        if (input_nodes instanceof NeuralNetwork) {
            let a = input_nodes;
            this.input_nodes = a.input_nodes;
            this.hidden_nodes = a.hidden_nodes;
            this.output_nodes = a.output_nodes;

            this.weights_ih = a.weights_ih.copy();
            this.weights_ho = a.weights_ho.copy();

            this.bias_h = a.bias_h.copy();
            this.bias_o = a.bias_o.copy();
        } else {
            this.input_nodes = input_nodes;
            this.hidden_nodes = hidden_nodes;
            this.output_nodes = output_nodes;

            this.weights_ih = new Matrix(this.hidden_nodes, this.input_nodes);
            this.weights_ho = new Matrix(this.output_nodes, this.hidden_nodes);
            this.weights_ih.randomize();
            this.weights_ho.randomize();

            this.bias_h = new Matrix(this.hidden_nodes, 1);
            this.bias_o = new Matrix(this.output_nodes, 1);
            this.bias_h.randomize();
            this.bias_o.randomize();
        }
    }

    predict(input_array) {
        let inputs = Matrix.fromArray(input_array);
        let hidden = Matrix.multiply(this.weights_ih, inputs);
        hidden.add(this.bias_h);
        // Activation function!
        hidden.map(this.sigmoid);

        let output = Matrix.multiply(this.weights_ho, hidden);
        output.add(this.bias_o);
        output.map(this.sigmoid);

        return output.toArray();
    }

    mutate(rate) {
        function mutate(val) {
            if (Math.random() < rate) {
                if (typeof randomGaussian === 'function') {
                    return val + randomGaussian(0, 0.1);
                } else {
                    // Fallback
                    let u = 0, v = 0;
                    while (u === 0) u = Math.random();
                    while (v === 0) v = Math.random();
                    let num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
                    return val + (num * 0.1);
                }
            } else {
                return val;
            }
        }
        this.weights_ih.map(mutate);
        this.weights_ho.map(mutate);
        this.bias_h.map(mutate);
        this.bias_o.map(mutate);
    }

    copy() {
        return new NeuralNetwork(this);
    }

    sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }
}
