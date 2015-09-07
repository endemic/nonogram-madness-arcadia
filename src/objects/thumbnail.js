var Thumbnail = function () {
    Arcadia.Shape.apply(this, arguments);

    this.size = {
        width: Thumbnail.SIZE,
        height: Thumbnail.SIZE
    };

    this.border = '10px white';
    this.color = 'white';
    this.shadow = '15px 15px 0 rgba(0, 0, 0, 0.5)';

    this.pixels = new Arcadia.Pool();
    this.pixels.factory = function () {
        return new Arcadia.Shape({
            color: 'black'
        });
    };
    this.add(this.pixels);
};

Thumbnail.prototype = new Arcadia.Shape();

Thumbnail.SIZE = 150;

Thumbnail.prototype.drawPreview = function (levelIndex, completed) {
    if (LEVELS[levelIndex] === undefined) {
        this.alpha = 0;
        return;
    } else if (this.alpha < 1) {
        this.alpha = 1;
    }

    this.pixels.deactivateAll();

    var self,
        clues,
        puzzleSize,
        pixelSize;

    self = this;
    clues = LEVELS[levelIndex].clues;
    puzzleSize = Math.sqrt(LEVELS[levelIndex].clues.length);
    pixelSize = Thumbnail.SIZE / puzzleSize;

    clues.forEach(function (clue, index) {
        var x = index % puzzleSize,
            y = Math.floor(index / puzzleSize),
            pixel;

        if (clue === 0) {
            return;
        }

        pixel = self.pixels.activate();

        pixel.size = {
            width: Math.round(pixelSize),
            height: Math.round(pixelSize)
        };

        pixel.position = {
            x: -self.size.width / 2 + x * pixelSize + pixelSize / 2,
            y: -self.size.height / 2 + y * pixelSize + pixelSize / 2
        };
    });
};

Thumbnail.prototype.highlight = function () {
    this.border = '10px orange';
};

Thumbnail.prototype.lowlight = function () {
    // this.border = '10px black';
    this.border = '10px white';
};
