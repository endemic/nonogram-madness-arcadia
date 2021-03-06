/*globals Arcadia, LevelSelectScene, CreditsScene, localStorage,
store, window, sona */

var UnlockScene = function () {
    'use strict';

    Arcadia.Scene.apply(this, arguments);

    // Should never occur; for testing on desktop only
    window.PRODUCT_DATA = window.PRODUCT_DATA || { price: '$999' };

    var text = [
        'I hope you\'ve enjoyed',
        'solving nonograms so far.',
        'Would you like to',
        'unlock 105 more puzzles',
        'PLUS random puzzles',
        'for only ' + window.PRODUCT_DATA.price + '?'
    ];

    var description = new Arcadia.Label({
        position: { x: 0, y: -150 },
        font: '24px uni_05_53',
        shadow: '5px 5px 0 rgba(0, 0, 0, 0.5)',
        text: text.join('\n')
    });
    this.add(description);

    var yesButton = new Arcadia.Button({
        position: { x: 0, y: 50 },
        size: { width: 100, height: 45 },
        text: 'yeah!',
        font: '24px uni_05_53',
        color: '#665945',
        border: '3px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        action: function () {
            sona.play('button');
            window.store.order(UnlockScene.PRODUCT_ID);
        }
    });
    this.add(yesButton);

    var noButton = new Arcadia.Button({
        position: { x: 0, y: 112 },
        size: { width: 100, height: 45 },
        text: 'nah.',
        font: '24px uni_05_53',
        color: '#665945',
        border: '3px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        action: function () {
            sona.play('button');
            Arcadia.changeScene(CreditsScene);
        }
    });
    this.add(noButton);

    var restoreButton = new Arcadia.Button({
        position: { x: 0, y: 212 },
        size: { width: 250, height: 45 },
        text: 'restore purchase',
        font: '24px uni_05_53',
        color: '#665945',
        border: '3px black',
        shadow: '8px 8px 0 rgba(0, 0, 0, 0.5)',
        action: function () {
            sona.play('button');
            window.store.order(UnlockScene.PRODUCT_ID);
        }
    });
    this.add(restoreButton);
};

UnlockScene.prototype = new Arcadia.Scene();

UnlockScene.PRODUCT_ID = 'com.ganbarugames.nonogram.unlock';

UnlockScene.initializeStore = function () {
    if (window.store === undefined) {
        return;
    }

    // Let's set a pretty high verbosity level, so that we see a lot of stuff
    // in the console (reassuring us that something is happening).
    store.verbosity = store.INFO;

    // We register a dummy product. It's ok, it shouldn't
    // prevent the store "ready" event from firing.
    store.register({
        id: UnlockScene.PRODUCT_ID,
        alias: 'Unlock all puzzles',
        type: store.NON_CONSUMABLE
    });


    store.when('Unlock all puzzles').updated(function (p) {
        // p = { id, price, loaded, valid, canPurchase }
        window.PRODUCT_DATA = p;
    });

    // When purchase of the full version is approved,
    // show some logs and finish the transaction.
    store.when('Unlock all puzzles').approved(function (order) {
        // console.log('Unlock all puzzles approved');

        localStorage.setBoolean('unlocked', true);
        order.finish();

        Arcadia.changeScene(LevelSelectScene);
    });

    // When every goes as expected, it's time to celebrate!
    store.ready(function () {
        console.log("*** STORE READY ***");
    });

    // After we've done our setup, we tell the store to do
    // it's first refresh. Nothing will happen if we do not call store.refresh()
    store.refresh();
};
