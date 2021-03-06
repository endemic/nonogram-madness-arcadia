/*jslint sloppy: true */
/*globals Arcadia, TitleScene, Grid, LEVELS, window, console, localStorage,
LevelSelectScene, Block, Preview, sona */

var GameScene = function GameScene(options) {
    Arcadia.Scene.apply(this, arguments);

    options = options || {};
    // this.startMusic();

    this.puzzleIndex = options.level;
    // TODO: remove
    if (this.puzzleIndex === undefined) {
        this.puzzleIndex = 1;
    }
    this.puzzle = LEVELS[this.puzzleIndex];
    this.clues = this.puzzle.clues;
    this.secondsLeft = 1739; // ~ 29 * 60

    this.showTutorial = TUTORIALS[this.puzzleIndex] !== undefined;
    this.tutorialStep = 0;

    if (this.puzzle.difficulty === 'random') {
        this.clues = this.generateRandomPuzzle(this.puzzle.title);
    }

    this.action = GameScene.FILL;
    this.puzzleSize = Math.sqrt(this.clues.length);
    this.state = new Array(this.clues.length);

    this.puzzleGrid = new Grid({
        size: Math.sqrt(this.clues.length),
        clues: this.clues,
        position: {
            x: 0,
            y: this.size.height / 2 - Grid.MAX_SIZE / 2 - 70
        },
        zIndex: 5
    });
    this.add(this.puzzleGrid);

    this.errorMessages = new Arcadia.Pool();
    this.errorMessages.factory = function () {
        return new Arcadia.Label({
            color: 'black',
            font: '24px uni_05_53',
            reset: function () {
                this.alpha = 1;
            }
        });
    };
    this.add(this.errorMessages);

    this.filledBlocks = new Arcadia.Pool();
    this.filledBlocks.factory = function () {
        return new Block({ type: 'fill' });
    };
    this.add(this.filledBlocks);

    // Pre-instantiate as many of these as we need
    while (this.filledBlocks.length < this.clues.filter(function (i) { return i === 1; }).length) {
        this.filledBlocks.activate();
    }
    this.filledBlocks.deactivateAll();

    this.markedBlocks = new Arcadia.Pool();
    this.markedBlocks.factory = function () {
        return new Block({ type: 'mark' });
    };
    this.add(this.markedBlocks);

    while (this.markedBlocks.length < this.clues.filter(function (i) { return i === 0; }).length) {
        this.markedBlocks.activate();
    }
    this.markedBlocks.deactivateAll();

    this.drawUi();

    if (this.showTutorial) {
        this.displayTutorial();
    }
};

GameScene.prototype = new Arcadia.Scene();

GameScene.FILL = 'fill';
GameScene.MARK = 'mark';

GameScene.prototype.update = function update(delta) {
    Arcadia.Scene.prototype.update.call(this, delta);

    this.secondsLeft -= delta;

    if (this.secondsLeft < 0) {
        this.secondsLeft = 0;
    }

    var minutes = this.zeroPad(Math.round(this.secondsLeft / 60), 2);
    var seconds = this.zeroPad(Math.round(this.secondsLeft % 60), 2);

    // TODO break this out into two labels, to prevent text jumping
    this.timerLabel.text = minutes + ':' + seconds;

    if (this.secondsLeft === 0) {
        alert('Out of time!');
        Arcadia.changeScene(LevelSelectScene);
    }

    if (this.showTutorial) {
        // check for player filling certain blocks
        var self = this;
        var indices = TUTORIALS[this.puzzleIndex]['indices'][this.tutorialStep] || [];
        var success = indices.every(function (index) {
            return self.state[index] && self.state[index].type === GameScene.FILL;
        });

        if (success) {
            this.tutorialStep += 1;
            this.displayTutorial();
        }
    }
};

GameScene.prototype.zeroPad = function zeroPad(string, length) {
    string = String(string);
    length = parseInt(length, 10);

    while (string.length < length) {
        string = '0' + string;
    }

    return string;
};

GameScene.prototype.displayTutorial = function () {
    this.tutorialLabel.text = TUTORIALS[this.puzzleIndex].text[this.tutorialStep] || '';

    var hintInfo = TUTORIALS[this.puzzleIndex].hints[this.tutorialStep];
    if (hintInfo) {
        this.hint.alpha = 0.5;
        this.hint.position = hintInfo.position;
        this.hint.size = hintInfo.size;
    } else {
        this.hint.alpha = 0;
    }
};

GameScene.prototype.onPointStart = function onPointStart(points) {
    Arcadia.Scene.prototype.onPointStart.call(this, points);

    if (this.gameOver) {
        return;
    }

    // Determine if within grid bounds
    var values = this.puzzleGrid.getRowAndColumn(points[0]);
    var row = values[0];
    var column = values[1];

    if (row !== null && column !== null) {
        this.markOrFill(row, column);
        this.puzzleGrid.highlight(column, row);
    }

    this.previousRow = row;
    this.previousColumn = column;
};

GameScene.prototype.onPointMove = function onPointMove(points) {
    Arcadia.Scene.prototype.onPointMove.call(this, points);

    if (this.gameOver) {
        return;
    }

    var values = this.puzzleGrid.getRowAndColumn(points[0]);
    var row = values[0];
    var column = values[1];

    if (row === this.previousRow && column === this.previousColumn) {
        return;
    }

    if (row !== null && column !== null) {
        this.markOrFill(row, column);
        this.puzzleGrid.highlight(column, row);
    }

    this.previousRow = row;
    this.previousColumn = column;
};

GameScene.prototype.onPointEnd = function (points) {
    Arcadia.Scene.prototype.onPointEnd.call(this, points);
    
    this.puzzleGrid.highlight(null, null);
    this.actionLock = 'none';
};

GameScene.prototype.markOrFill = function markOrFill(row, column) {
    var block,
        message,
        self = this;

    var index = row * this.puzzleSize + column;
    var valid = this.clues[index] === 1;
    var existingBlock = this.state[index];
    var markOffset = 2;
    var fillOffset = 3;

    if (this.action === GameScene.FILL) {
        if (existingBlock) {
            // Already either marked or filled
            sona.play('invalid');
        } else if (valid) {
            // Fill
            block = this.filledBlocks.activate();
            block.position.x = column * this.puzzleGrid.cellSize + this.puzzleGrid.bounds.left + block.size.width / 2 + fillOffset;
            block.position.y = row * this.puzzleGrid.cellSize + this.puzzleGrid.bounds.top + block.size.height / 2 + fillOffset;
            block.scale = 1.75;
            block.tween('scale', 1, 200);
            this.state[index] = block;
            this.preview.plot(column, row);
            sona.play('fill');

            this.checkCompleteness(row, column);
            this.checkWinCondition();
        } else {
            // Invalid move
            this.secondsLeft -= 60;
            message = this.errorMessages.activate();
            message.text = '-1 minute';
            message.position.x = column * this.puzzleGrid.cellSize + this.puzzleGrid.bounds.left;
            message.position.y = row * this.puzzleGrid.cellSize + this.puzzleGrid.bounds.top;
            message.tween('position', {
                x: message.position.x,
                y: message.position.y - 50
            }, 700, 'expoOut', function () {
                message.tween('alpha', 0, 300, 'linearNone', function () {
                    self.errorMessages.deactivate(message);
                });
            });
            sona.play('error');
        }
    } else if (this.action === GameScene.MARK) {
        if (!existingBlock && this.actionLock !== 'remove') {
            // Mark
            this.actionLock = 'mark';
            block = this.markedBlocks.activate();
            block.position.x = column * this.puzzleGrid.cellSize + this.puzzleGrid.bounds.left + block.size.width / 2 + markOffset;
            block.position.y = row * this.puzzleGrid.cellSize + this.puzzleGrid.bounds.top + block.size.height / 2 + markOffset;
            block.scale = 1.3;
            block.tween('scale', 1, 200);
            this.state[index] = block;
            sona.play('mark');
        } else if (existingBlock && existingBlock.type === GameScene.MARK && this.actionLock !== 'mark') {
            // Remove previous mark
            this.actionLock = 'remove';
            this.markedBlocks.deactivate(existingBlock);
            this.state[index] = null;
            sona.play('mark');
        } else {
            // Block is already filled
            sona.play('invalid');
        }
    }

};

GameScene.prototype.checkWinCondition = function checkWinCondition() {
    var success = true;
    var self = this;

    this.clues.forEach(function (clue, index) {
        if (clue === 0 || !success) {
            return;
        }

        if (!self.state[index] || self.state[index].type !== GameScene.FILL) {
            success = false;
        }
    });

    if (success) {
        this.win();
    }
};

GameScene.prototype.win = function () {
    this.gameOver = true;

    var completedLevels = localStorage.getObject('completedLevels') || [];
    while (completedLevels.length < LEVELS.length) {
        completedLevels.push(null);
    }
    completedLevels[this.puzzleIndex] = true;
    localStorage.setObject('completedLevels', completedLevels);

    // "window" with a preview object
    var modal = new Arcadia.Shape({
        position: {x: 0, y: -this.size.height},
        size: {width: this.size.width / 1.5, height: this.size.width},
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        zIndex: 0
    });
    modal.enablePointEvents = true; // allow touch input to be passed to child button
    this.add(modal);

    var thumbnail = new Thumbnail({
        size: {width: 175, height: 170},
        position: {x: 0, y: -55}
    });
    thumbnail.drawPreview(this.puzzleIndex, completedLevels);
    thumbnail.highlight();
    // thumbnail.border = '5px black';
    modal.add(thumbnail);

    var label = new Arcadia.Label({
        position: {x: 0, y: 65},
        text: LEVELS[this.puzzleIndex].title.replace(' ', '\n'),
        color: 'black',
        font: '32px uni_05_53'
    });
    modal.add(label);

    var percentComplete = completedLevels.filter(function (entry) {
        return entry === true;
    }).length / completedLevels.length;
    var incompleteLevel = completedLevels.indexOf(null);
    var nagShown = localStorage.getBoolean('nagShown');
    var NAG_FOR_REVIEW_THRESHOLD = 0.4;

    var nextButton = new Arcadia.Button({
        size: { width: 170, height: 45 },
        position: {x: 0, y: 130},
        color: '#665945',
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        label: new Arcadia.Label({
            text: 'next',
            font: '32px uni_05_53',
            position: { x: 0, y: -5 }
        }),
        action: function () {
            sona.play('button');

            if (incompleteLevel === -1) {
                Arcadia.changeScene(LevelSelectScene);
            } else if (Arcadia.isLocked() && incompleteLevel >= Arcadia.FREE_LEVEL_COUNT) {
                Arcadia.changeScene(UnlockScene);
            } else if (Arcadia.ENV.cordova && percentComplete > NAG_FOR_REVIEW_THRESHOLD && !nagShown) {
                Arcadia.changeScene(ReviewNagScene, {level: incompleteLevel});
            } else {
                Arcadia.changeScene(GameScene, {level: incompleteLevel});
            }
        }
    });
    modal.add(nextButton);

    window.setTimeout(function () {
        sona.play('win');
        modal.tween('position', {x: 0, y: 0}, 750);
    }, 1000);
};


GameScene.prototype.checkCompleteness = function checkCompleteness(row, column) {
    var i,
        rowIndex,
        columnIndex,
        rowTotal = 0,
        columnTotal = 0,
        completedRowTotal = 0,
        completedColumnTotal = 0;

    for (i = 0; i < this.puzzleSize; i += 1) {
        rowIndex = row * this.puzzleSize + i;
        columnIndex = i * this.puzzleSize + column;

        if (this.state[rowIndex] && this.state[rowIndex].type === GameScene.FILL) {
            completedRowTotal += 1;
        }

        if (this.state[columnIndex] && this.state[columnIndex].type === GameScene.FILL) {
            completedColumnTotal += 1;
        }

        if (this.clues[rowIndex] === 1) {
            rowTotal += 1;
        }

        if (this.clues[columnIndex] === 1) {
            columnTotal += 1;
        }
    }

    if (rowTotal === completedRowTotal) {
        this.puzzleGrid.horizontalClues[row].color = 'lightgrey';
    }

    if (columnTotal === completedColumnTotal) {
        this.puzzleGrid.verticalClues[column].color = 'lightgrey';
    }
};

GameScene.prototype.generateRandomPuzzle = function generateRandomPuzzle(difficulty) {
    var clues,
        value,
        percentage;

    if (difficulty === 'Easy') {
        percentage = 0.68;
    } else if (difficulty === 'Medium') {
        percentage = 0.62;
    } else {
        percentage = 0.55;
    }

    clues = [];

    while (clues.length < 100) {
        if (Math.random() < percentage) {
            value = 1;
        } else {
            value = 0;
        }

        clues.push(value);
    }

    return clues;
};

GameScene.prototype.startMusic = function startMusic() {
    if (localStorage.getBoolean('playMusic') === false) {
        return;
    }

    if (Math.random() < 0.5) {
        this.bgm = 'bgm-one';
    } else {
        this.bgm = 'bgm-two';
    }

    sona.loop(this.bgm);
};

GameScene.prototype.stopMusic = function stopMusic() {
    if (localStorage.getBoolean('playMusic') === false) {
        return;
    }
    sona.stop(this.bgm);
};

GameScene.prototype.drawUi = function drawUi() {
    var self = this,
        timerBackground,
        timeLeftLabel,
        previewBackground,
        previewLabel,
        markIcon,
        fillIcon;

    timerBackground = new Arcadia.Shape({
        size: { width: 170, height: 135 },
        position: { x: -92.5, y: -195 },
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)'
    });
    this.add(timerBackground);

    timeLeftLabel = new Arcadia.Label({
        position: { x: 0, y: 25 },
        text: 'time left',
        color: 'black',
        font: '32px uni_05_53'
    });
    timerBackground.add(timeLeftLabel);

    this.timerLabel = new Arcadia.Label({
        position: { x: 0, y: -22.5 },
        text: '30:00',
        color: 'black',
        font: '44px uni_05_53'
    });
    timerBackground.add(this.timerLabel);

    previewBackground = new Arcadia.Shape({
        size: { width: 170, height: 135 },
        position: { x: 92.5, y: -195 },
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)'
    });
    this.add(previewBackground);

    previewLabel = new Arcadia.Label({
        position: { x: 0, y: -55 },
        text: 'preview',
        color: 'black',
        font: '24px uni_05_53'
    });
    previewBackground.add(previewLabel);

    this.preview = new Preview({
        position: { x: 0, y: 10 },
        puzzleSize: this.puzzleSize
    });
    previewBackground.add(this.preview);

    // Mark button
    this.markButton = new Arcadia.Button({
        position: { x: -92.5, y: 300 },
        size: { width: 170, height: 45 },
        color: '#665945',
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        label: new Arcadia.Label({
            text: 'mark',
            font: '32px uni_05_53',
            position: { x: 20, y: -5 }
        }),
        action: function () {
            sona.play('button');
            self.action = GameScene.MARK;
            self.fillButton.label.color = 'white';
            this.label.color = 'orange';
        }
    });
    markIcon = new Arcadia.Shape({
        size: { width: 25, height: 25 },
        position: { x: -45, y: 0 },
        border: '1px black'
    });
    markIcon.add(new Block({ type: 'mark' }));
    this.markButton.add(markIcon);
    this.add(this.markButton);

    // Fill button
    this.fillButton = new Arcadia.Button({
        position: { x: 92.5, y: 300 },
        size: { width: 170, height: 45 },
        color: '#665945',
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        label: new Arcadia.Label({
            text: 'fill',
            font: '32px uni_05_53',
            color: 'orange',
            position: { x: 15, y: -5 }
        }),
        action: function () {
            sona.play('button');
            self.action = GameScene.FILL;
            self.markButton.label.color = 'white';
            this.label.color = 'orange';
        }
    });
    fillIcon = new Arcadia.Shape({
        size: { width: 26, height: 26 },
        position: { x: -30, y: 0 }
    });
    fillIcon.add(new Block({ type: 'fill' }));
    this.fillButton.add(fillIcon);
    this.add(this.fillButton);

    // "Clear" button
    this.add(new Arcadia.Button({
        position: { x: 92.5, y: -300 },
        size: { width: 170, height: 45 },
        color: '#665945',
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        label: new Arcadia.Label({
            text: 'clear',
            font: '32px uni_05_53',
            position: { x: 0, y: -5 }
        }),
        action: function () {
            sona.play('button');

            // Remove marked/filled blocks
            self.filledBlocks.deactivateAll();
            self.markedBlocks.deactivateAll();

            // Reset state
            for (var i = 0; i < self.state.length; i += 1) {
                self.state[i] = null;
            }

            // Clear preview
            self.preview.clear();

            // Remove any "dimmed" clues
            self.puzzleGrid.horizontalClues.forEach(function (clue) {
                clue.color = 'black';
            });

            self.puzzleGrid.verticalClues.forEach(function (clue) {
                clue.color = 'black';
            });
        }
    }));

    // "Quit" button
    this.add(new Arcadia.Button({
        position: { x: -92.5, y: -300 },
        size: { width: 170, height: 45 },
        color: '#665945',
        border: '5px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        label: new Arcadia.Label({
            text: 'quit',
            font: '32px uni_05_53',
            position: { x: 0, y: -5 }
        }),
        action: function () {
            sona.play('button');
            Arcadia.changeScene(LevelSelectScene);
        }
    }));

    // Hide the timer/preview if showing the tutorial
    if (this.showTutorial) {
        this.deactivate(timerBackground);
        this.deactivate(timeLeftLabel);
        this.deactivate(this.timerLabel);

        this.deactivate(previewBackground);
        this.deactivate(previewLabel);
        this.deactivate(this.preview);

        this.tutorialLabelBackground = new Arcadia.Shape({
            border: '5px black',
            shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
            size: { width: Grid.MAX_SIZE / 1.2, height: 165 },
            position: { x: 0, y: -150 }
        });
        this.add(this.tutorialLabelBackground);

        this.tutorialLabel = new Arcadia.Label({
            color: 'black',
            text: 'this text replaced by data in TUTORIALS global',
            font: '18px uni_05_53'
        });
        this.tutorialLabelBackground.add(this.tutorialLabel);

        this.hint = new Arcadia.Shape({
            color: 'orange',
            alpha: 1,
            size: { width: Grid.CELL_SIZE, height: Grid.CELL_SIZE },
            position: { x: 0, y: 0 },
            zIndex: 4
        });
        this.add(this.hint);
    }
};
