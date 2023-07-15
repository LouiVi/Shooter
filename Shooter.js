////////////////////////////////////////////////////////////////////////////////
// Shooter v1.0
// 07/10/2014 - Chris Hopkin
//
// Game Resources from http://opengameart.org
//
// Explosion Sound Effect by dklon (CC BY 3.0 license)
// (http://opengameart.org/content/boom-pack-1)
//
// Fighter Graphics by MillionthVector (CC BY 3.0 license)
// (http://opengameart.org/content/animated-fighter-spaceship)
//
// Music by Jan125  (CC BY 3.0 license)
// (http://opengameart.org/content/stereotypical-90s-space-shooter-music)
//
// Alien Ship Graphics by surt (CC BY-SA 3.0 license)
// (http://opengameart.org/content/shmup-ships)
//
// Background Graphic by freedohm (CC0 1.0 Universal license)
// (http://opengameart.org/content/nebulus)
//
// Bullet Sound Effect by Luke.RUSTLTD (CC0 1.0 Universal license)
// (http://opengameart.org/content/gunloop-8bit)
//
// CC BY 3.0 - http://creativecommons.org/licenses/by/3.0/
// CC BY-SA 3.0 - http://creativecommons.org/licenses/by-sa/3.0/
// CC0 1.0 Universal - http://creativecommons.org/publicdomain/zero/1.0/

var background = null;
var fighter = null;
var bullets = [];
var enemies = [];
var enemyImages = [];
var explosions = [];
var explosionImageSequence = [];
var levelNumber = 0;
var scoreCounter = 0;
var fireBulletIntervalTimer = null;
var fighterMoving = false;
var canvasWidth = 480;
var canvasHeight = 800;

// objects.js contains the declarations for the objects used in the game,
// including Background, Fighter, Enemy, Explosion, etc.
app.LoadScript("object.js");

// Called when application is started.
function OnStart()
{
    // Lock screen orientation to Portrait.
    app.SetOrientation("Portrait");  
    app.PreventScreenLock(true);
    
    layMain = app.CreateLayout("Absolute", "FillXY");
    app.AddLayout(layMain);
    
    // Create an blank image to act as our drawing canvas.
    // Make sure the dimensions of the canvas match the aspect ratio of the device display
    var displayAspectRatio = app.GetDisplayWidth() / app.GetDisplayHeight();
    canvasWidth = displayAspectRatio * canvasHeight;
    canvas = app.CreateImage( null, 1.0, 1.0, "fix", canvasWidth, canvasHeight);
    canvas.SetAutoUpdate(false);
    canvas.SetOnTouch(OnCanvasTouch);
    canvas.SetMaxRate(30);
    layMain.AddChild( canvas );
    
    // Create the scrolling background that fills the canvas width and is twice
    // the canvas height
    background = new Background(app.CreateImage("Img/GalaxyTres.jpg"), 2.0, 2.0);
    
    // Load the fighter image sequence. In each image, the fighter is rolling
    // to the left or right, with the centre image being the fighter in it's
    // un-rolled state.
    var fighterImages = [];
    for(var i = 0; i < 10; i++)
    {
        imageNumString = ("000" + (i+1)).slice(-4);
        fighterImages.push(app.CreateImage("Img/smallfighter" + imageNumString + ".png"));
    }
    
    fighter = new Fighter(fighterImages);
    fighter.SetCentre(new Point(0.5, 0.85));
    
    // Create a pool of 40 bullets
    var imgBullet = app.CreateImage("Img/bullet.png");
    for(var i = 0; i < 40; i++)
    {
        var bullet = new Bullet(imgBullet);
        bullets.push(bullet);
    }
    
    // Load the sequence of images for the explosion 
    for(var i = 0; i < 24; i++)
    {
        // Construct the filenames for the 24 images in the explosion
        // sequence - expl_02_0000.png, expl_02_0001.png, etc
        imageNumString = ("000" + i).slice(-4);
        explosionImageSequence.push(app.CreateImage("Img/expl_02_" + imageNumString + ".png"));
    }
    
    // Create the score overlay - shows the Wave and Score at the top of the screen
    layScore = app.CreateLayout("Linear", "Horizontal, FillX");
    txtWave = app.CreateText("Wave 1", 0.5, -1, "Left");
    txtWave.SetTextSize(22);
    txtWave.SetPadding(0.025, 0,0,0);
    txtWave.SetTextColor("#AAFFE100");
    layScore.AddChild(txtWave);
    txtScore = app.CreateText("000000000", 0.5, -1, "Right");
    txtScore.SetTextSize(22);
    txtScore.SetPadding(0,0,0.025,0);
    txtScore.SetTextColor("#AAFFE100");
    layScore.AddChild(txtScore);
    layMain.AddChild(layScore);
    
    // Create the Game Over screen, initially hidden
    layGameOver = app.CreateLayout("Linear", "FillXY, VCenter");
    txtGameOver = app.CreateText("Game Over");
    txtGameOver.SetTextSize(42);
    txtGameOver.SetTextColor("#FFFFE100");
    layGameOver.AddChild(txtGameOver);
    btnRetry = app.CreateButton("Retry", 0.35);
    btnRetry.SetMargins(0, 0.1, 0, 0);
    btnRetry.SetTextSize(24);
    btnRetry.SetOnTouch(OnRetry);
    layGameOver.AddChild(btnRetry);
    layGameOver.SetVisibility("Hide");
    layMain.AddChild(layGameOver);
    
    // Load the background music
    player = app.CreateMediaPlayer();
    player.SetOnReady(player_OnReady);
    player.SetOnComplete(player_OnComplete);
    player.SetFile("Snd/music.mp3");
    
    // Load the explosion sound effect
    explosionPlayer = app.CreateMediaPlayer();
    explosionPlayer.SetFile("Snd/explosion.mp3");
    
    // Load the bullet sound effect
    bulletPlayer = app.CreateMediaPlayer();
    bulletPlayer.SetFile("Snd/bullet.mp3");
    bulletPlayer.SetVolume(0.05, 0.05);
    
    // Create the first wave of enemies
    StartNextLevel();

    // Set the render frame interval at 30 frames per second
    setInterval(RenderFrame, 1000/30);
    
    app.SetDebugEnabled(false);
}

function StartNextLevel()
{
    // First time StartNextLevel is called, load the enemy ship images
    if(enemyImages.length == 0)
    {
        enemyImages.push(app.CreateImage("Img/enemy1.png"));
        enemyImages.push(app.CreateImage("Img/enemy2.png"));
        enemyImages.push(app.CreateImage("Img/enemy3.png"));
    }
    
    // Start with 10 enemies, increasing by 1 each new level
    var enemyCount = 10 + levelNumber;
    
    // Choose one of the 3 enemy types for this level.
    // Cylcle the enemy type on each level.
    var enemyIndex = levelNumber % 3;
    var direction = 1;

    for(var i = 0; i < enemyCount; i++)
    {
        var enemy = new Enemy(enemyImages[enemyIndex]);
        
        // Stagger the start of each enemy by 20 frames so they
        // don't all appear at the same time
        enemy.startDelay = i * 20;
        
        // direction determines which side of the screen the enemy
        // starts from. Alternate the start direction of each enemy
        enemy.direction = direction;
        direction *= -1;
        enemies.push(enemy);
    }
    
    levelNumber++;
    
    txtWave.SetText("Wave " + levelNumber);
}

// The main render function called at a rate of 30 times per second
function RenderFrame()
{
    // Background
    background.Update();
    background.Draw(canvas);
    
    // Fighter. If the user is not currently moving the figher, make sure it
    // rolls back to it's centre position
    if(!fighterMoving)
    {
        fighter.RollToCentre();
    }
    fighter.Draw(canvas);
    
    // Bullets
    UpdateBullets();
    for(var i = 0; i < bullets.length; i++)
    {
        bullets[i].Draw(canvas);
    }
    
    // Enemies
    UpdateEnemies();
    if(enemies.length > 0)
    {
        for(var i = 0; i < enemies.length; i++)
        {
            enemies[i].Draw(canvas);
        }
    }
    else if(!fighter.destroyed)
    {
        // Create the next wave of enemies if the current wave has been destroyed
        StartNextLevel();    
    }

    TestForCollisions();
    
    // Explosions
    UpdateExplosions();
    for(var i = 0; i < explosions.length; ++i)
    {
        explosions[i].Draw(canvas);
    }

    // Update the canvas.
    canvas.Update();
}

// Update the positions of all the active bullets
function UpdateBullets()
{
    for(var i = 0; i < bullets.length; i++)
    {
        bullets[i].UpdatePosition();
    }
}

// Update the positions of the enemy ships
function UpdateEnemies()
{
    var i = 0;
    while(i < enemies.length)
    {
        enemies[i].UpdatePosition();
        
        if(enemies[i].active)
        {
            i++;
        }
        else
        {
            // If the enemy is no longer active (destroyed or
            // left the bottom of the screen) remove it
            enemies.splice(i, 1);
        }
    }
}

// Update all active explosions by stepping to the next image in
// the explosion image sequence
function UpdateExplosions()
{
    var i = 0;
    while(i < explosions.length)
    {
        explosions[i].NextImage();
        
        if(explosions[i].active)
        {
            i++;
        }
        else
        {
            // If the explosion has finished, remove it
            explosions.splice(i, 1);
        }
    }
}

function TestForCollisions()
{
    // Loop through all our enemy objects
    for(var i = 0; i < enemies.length; i++)
    {
        if(enemies[i].active && enemies[i].position.y > 0)
        {
            var enemyRect = enemies[i].Rect();
            
            // Loop through all active bullets
            for(var b = 0; b < bullets.length; b++)
            {
                if(bullets[b].active)
                {
                    // Check if the bullet hit the enemy
                    if(enemies[i].Hit(bullets[b]))
                    {
                        // Bullet is no longer active after a successful hit
                        bullets[b].active = false;
                        
                        // The emeny may take multiple hits to destroy
                        if(!enemies[i].active)
                        {
                            // Start an explosion at the enemies position
                            StartExplosion(enemies[i].Rect().Centre(), 0);
                            // Increase the score counter for destroying this enemy
                            UpdateScore(100);
                            //scoreCounter += 100;
                        }
                    }
                }
            }
            
            // Check Enemy Fighter collisions
            if(enemies[i].active && !fighter.destroyed)
            {
                if(fighter.Hit(enemies[i]))
                {
                    enemies[i].active = false;
                    StartExplosion(enemies[i].Rect().Centre(), 0);
                    GameOver();
                }
            }
        }
    }
}

// Start a new explosion
function StartExplosion(centre, startDelay)
{
    var explosion = new Explosion(explosionImageSequence);
    explosion.Start(centre, startDelay);
    explosions.push(explosion);
    
    // Play the explosion sound effect
    explosionPlayer.SeekTo(0);
    explosionPlayer.Play();
}

function FireBullet()
{
    // Fire a new bullet if the fighter has not been destroyed
    if(!fighter.destroyed)
    {
        // Find the first inactive bullet from the bullet pool and
        // make it active, with a start position at the top of the
        // fighter
        for(var i = 0; i < bullets.length; i++)
        {
            if(!bullets[i].active)
            {
                var fighterRect = fighter.Rect();
                
                bullets[i].SetCentre(
                    new Point(fighterRect.Centre().x, fighterRect.top));
                
                bullets[i].active = true;
                
                // Play the bulet sound effect
                bulletPlayer.SeekTo(0);
                bulletPlayer.Play();
                
                break;
            }
        }
    }
}

function OnCanvasTouch(ev)
{    
    if(ev.action == "Up")
    {
        // Make sure we stop firing bullets when the user stops
        // touching the screen
        clearInterval(fireBulletIntervalTimer);
        fireBulletIntervalTimer = null;
        
        fighterMoving = false;
    }
    else if(ev.action == "Move")
    {
        var fighterCentre = fighter.Rect().Centre();
        
        // Roll the fighter to the Left or Right depending on the direction
        // the user is swiping their finger
        if(fighterCentre.x < ev.x[0])
        {
            fighter.RollToRight();
        }
        else if(fighterCentre.x > ev.x[0])
        {
            fighter.RollToLeft();
        }
        fighterMoving = true;
        
        // Update the position of the fighter to the touch point x,y coordinates
        fighter.SetCentre(new Point(ev.x[0], ev.y[0] - fighter.Rect().Height()/1.5));
        
        // If we are not currently firing bullets, start firing
        if(fireBulletIntervalTimer == null)
        {
            // Fire a bullet, then again every 40ms until the Up event
            FireBullet();
            fireBulletIntervalTimer = setInterval(FireBullet, 40);
        }
    }
}

function UpdateScore(points)
{
    scoreCounter += points;
    
    // Format the score text with leading zeros
    var scoreText = scoreCounter.toString();
    while(scoreText.length < 9)
    {
        scoreText = "0" + scoreText;
    }
    
    txtScore.SetText(scoreText);
}

function GameOver()
{
    // Destroy the fighter, and start explosions over the fighters position
    fighter.destroyed = true;
    var fighterRect = fighter.Rect();
    StartExplosion(fighterRect.Centre(), 0);
    StartExplosion(new Point(fighterRect.Centre().x, fighterRect.top), 3);
    StartExplosion(new Point(fighterRect.Centre().x, fighterRect.bottom), 9);
    StartExplosion(new Point(fighterRect.left, fighterRect.Centre().y), 6);
    StartExplosion(new Point(fighterRect.right, fighterRect.Centre().y), 12);
    
    // Vibrate sequence
    app.Vibrate("50,100,5,150,10,200,15,250,20,500");
    
    // Show the Game Over screen
    layGameOver.Animate("SlideFromLeft");
}

// Called when the Retry button is pressed.
// Reset everything back to the starting state
function OnRetry()
{
    layGameOver.Animate("SlideToRight");
    enemies = [];
    explosions = [];
    levelNumber = 0;
    scoreCounter = 0;
    UpdateScore(0);
    clearInterval(fireBulletIntervalTimer);
    fireBulletIntervalTimer = null;
    fighterMoving = false;
    fighter.SetCentre(new Point(0.5, 0.85));
    fighter.destroyed = false;
    StartNextLevel();
}

// Start playing the background music when the media player is ready
function player_OnReady()
{
    player.SeekTo(0);
    player.Play();
}

// Start playing the background music from the beginning once complete
function player_OnComplete()
{
    player.SeekTo(0);
    player.Play();
}