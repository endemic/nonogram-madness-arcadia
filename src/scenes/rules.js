/*jslint sloppy: true */
/*globals Arcadia, TitleScene, localStorage, window, sona */

var RulesScene = function () {
    Arcadia.Scene.apply(this);

    var titleLabel,
        backButton,
        detailLabel,
        text;

    text = [
        'The goal of a nonogram puzzle is\n',
        'to "fill" all the correct blocks in\n',
        'a grid to reveal a hidden picture.\n',
        'The key to solving each puzzle is\n',
        'the numbers on the top and left of\n',
        'the grid. Each number gives you a\n',
        'clue about how many blocks are\n',
        'filled in each row or column.\n\n',
        'For example, if the clue for a row\n',
        'was "4 3 1", that means there are\n',
        'four sequentially filled blocks, a\n',
        'gap of one (or more), three filled\n',
        'blocks, another gap, and then\n',
        'finally one filled block on its own.\n\n',
        'In a 10 x 10 puzzle grid, this\n',
        'clue solves the whole row:\n',
        '4 filled + 1 blank + 3 filled +\n',
        '1 blank + 1 filled = 10 total.\n\n',
        'Solve easy clues first, then you\n',
        'can logically fill in the rest of the\n',
        'blocks in the grid.'
    ];

    titleLabel = new Arcadia.Label({
        text: 'Rules',
        font: '48px uni_05_53',
        shadow: '5px 5px 0 rgba(0, 0, 0, 0.5)',
        position: {
            x: 0,
            y: -225
        }
    });
    this.add(titleLabel);

    backButton = new Arcadia.Button({
        position: { x: -this.size.width / 2 + 70, y: -this.size.height / 2 + 30 },
        size: { width: 110, height: 35 },
        border: '5px black',
        color: '#665945',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        label: new Arcadia.Label({
            text: '< title',
            color: 'white',
            font: '24px uni_05_53',
            position: { x: 0, y: -2.5 }
        }),
        action: function () {
            sona.play('button');
            Arcadia.changeScene(TitleScene);
        }
    });
    this.add(backButton);

    detailLabel = new Arcadia.Label({
        text: text.join(''),
        // alignment: 'left',
        font: '18px uni_05_53',
        shadow: '5px 5px 0 rgba(0, 0, 0, 0.5)',
        position: { x: 0, y: 50 }
    });
    this.add(detailLabel);

};

RulesScene.prototype = new Arcadia.Scene();
