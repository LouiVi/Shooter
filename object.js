// Point - represents an x and y canvas position
function Point(x, y)
{
    this.x = x;
    this.y = y;
}

// Rect - represents a rectangle
function Rect(left, top, right, bottom)
{
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
    
    this.Width = function()
    {
        return this.right - this.left;
    }
    
    this.Height = function()
    {
        return this.bottom - this.top;
    }
    
    this.Centre = function()
    {
        var centre = new Point(0,0);
        centre.x = this.left + (this.Width() / 2);
        centre.y = this.top + (this.Height() / 2);
        
        return centre;
    }
    
    this.Intersects = function(otherRect)
    {
        return !(otherRect.left >= this.right || 
                 otherRect.right <= this.left || 
                 otherRect.top >= this.bottom ||
                 otherRect.bottom <= this.top);
    }
}

// Background - represents a continuous vertical scrolling background
function Background(img, imgWidth, imgHeight)
{
    this.img = img;
    this.increment = 0.005;
    this.yPosition = 0;
    this.width = imgWidth;
    this.height = imgHeight;
    
    this.Update = function()
    {
        this.yPosition += this.increment;
        if(this.yPosition >= this.height)
        {
            this.yPosition = (this.yPosition - this.height);
        }
    }
    
    this.Draw = function(canvas)
    {
        canvas.DrawImage(this.img, 0, -this.height + this.yPosition, this.width, this.height, 0);
        canvas.DrawImage(this.img, 0, this.yPosition, this.width, this.height, 0);
    }
}

// Enemy - stores information about each enemy ship
function Enemy(img)
{
    this.img = img;
    
    // position is the top-left position of the enemy in terms of a percentage 
    // canvas width and height (range 0..1)
    this.position = new Point(0,0); 

    // speedX and speedY determine the distance the enemy moves in x and y on
    // each update
    this.speedX = 10;
    this.speedY = 0.005;
    
    // Calculate the width and height to ensure the bullet maintains its original
    // aspect ratio at the current canvas size. width and height are expressed as
    // a percentage of the canvas width and height (range 0..1)
    this.imageAspectRatio = 1.0;
    this.width = 0.1;
    this.height = ((this.width * canvasWidth) / this.imageAspectRatio) / canvasHeight;
    
    this.angle = 0; 
    this.spin = 15;
    this.startDelay = 0; // the number of frames before the enemy appears
    this.direction = 1; // determines the start direction (-1 = from left, 1 = from right)
    this.strength = 1; // requires 1 hit to be destroyed
    this.active = true;
    
    // Start off screen
    this.position.y = -this.height;
    
    this.Rect = function()
    {
        var rect = new Rect(0,0,0,0);
        rect.left = this.position.x;
        rect.top = this.position.y;
        rect.right = rect.left + this.width;
        rect.bottom = rect.top + this.height;
        
        return rect;
    }
    
    this.UpdatePosition = function()
    {
        if(this.startDelay == 0)
        {
            var horizontalRange = 1.0 - this.Rect().Width();
            
            this.position.y += this.speedY;
            if(this.position.y < 1.0)
            {
                var horizontalDistance = ((Math.cos(this.position.y * this.speedX) + 1) / 2) * horizontalRange;
                if(this.direction == 1)
                {
                    this.position.x = horizontalDistance;
                }
                else
                {
                    this.position.x = (horizontalRange - horizontalDistance);
                }
    
                this.angle += this.spin;
            }
            else
            {
                this.active = false; // Off the bottom of the scren
            }
        }
        else
        {
            this.startDelay--;
        }
    }
    
    this.Hit = function(bullet)
    {
        if(bullet.Rect().Intersects(this.Rect()))
        {
            if(--this.strength == 0)
            {
                this.active = false;
            }
            
            return true;
        }
        
        return false;
    }
    
    this.Draw = function(canvas)
    {
        if(this.active)
        {
            canvas.DrawImage(
                this.img, this.position.x, this.position.y, this.width, this.height, this.angle);
        }
    }
}

// Bullet - stores information about each bullet
function Bullet(img)
{
    this.img = img;
    
    // position is the top-left position of the bullet in terms of a percentage 
    // canvas width and height (range 0..1)
    this.position = new Point(0,0);
    
    // Calculate the width and height to ensure the bullet maintains its original
    // aspect ratio at the current canvas size. width and height are expressed as
    // a percentage of the canvas width and height (range 0..1)
    this.imageAspectRatio = 9 / 16;
    this.width = 0.025;
    this.height = ((this.width * canvasWidth) / this.imageAspectRatio) / canvasHeight;
    
    // speed determines the distance the bullet moves on each update
    this.speed = 0.02;
    
    // active determines if the bullet will be drawn or not
    this.active = false;
    
    this.SetCentre = function(centre)
    {
        this.position.x = centre.x - (this.Rect().Width() / 2);
        this.position.y = centre.y - (this.Rect().Height() / 2);
    }
    
    // Returns the rectangle representing the bullets current canvas position
    this.Rect = function()
    {
        var rect = new Rect(0,0,0,0);
        rect.left = this.position.x;
        rect.top = this.position.y;
        rect.right = rect.left + this.width;
        rect.bottom = rect.top + this.height;
        
        return rect;
    }
    
    this.UpdatePosition = function()
    {
        if(this.active)
        {
            this.position.y -= this.speed;
            
            // Disable the bullet if it leaves the top of the screen            
            if(this.Rect().bottom < 0)
            {
                this.active = false;
            }
        }
    }
    
    this.Draw = function(canvas)
    {
        if(this.active)
        {
            canvas.DrawImage(
                this.img, this.position.x, this.position.y, this.width, this.height, 0);
        }
    }
}

// Fighter - stores information about the fighter ship
function Fighter(fighterImages)
{
    this.fighterImages = fighterImages;
    this.centreImage = fighterImages.length / 2;
    this.img = fighterImages[this.centreImage];
    this.destroyed = false;
    
    // position is the top-left position of the fighter in terms of a percentage 
    // canvas width and height (range 0..1)
    this.position = new Point(0.0,0.0);
    
    // Calculate the width and height to ensure the fighter maintains its original
    // aspect ratio at the current canvas size. width and height are expressed as
    // a percentage of the canvas width and height (range 0..1)
    this.imageAspectRatio = 55 / 135;
    this.width = 0.1;
    this.height = ((this.width * canvasWidth) / this.imageAspectRatio) / canvasHeight;
    
    this.Rect = function()
    {
        var rect = new Rect(0,0,0,0);
        rect.left = this.position.x;
        rect.top = this.position.y;
        rect.right = rect.left + this.width;
        rect.bottom = rect.top + this.height;
        
        return rect;
    }
    
    // For collision hit testing with the fighter, shrink the width of the rect
    // so it is tighter around the main body of the fighter
    this.CollisionRect = function()
    {
        var collisionRect = this.Rect();
        var collisionWidth = collisionRect.Width() * 0.4;
        collisionRect.left += (collisionWidth / 2);
        collisionRect.right -= (collisionWidth / 2);
        
        return collisionRect;
    }
    
    this.SetCentre = function(centre)
    {
        this.position.x = centre.x - (this.Rect().Width() / 2);
        this.position.y = centre.y - (this.Rect().Height() / 2);
    }
    
    this.Draw = function(canvas)
    {
        if(!this.destroyed)
        {
            canvas.DrawImage(
                this.img, this.position.x, this.position.y, this.width, this.height, 0);
        }
    }
    
    this.Hit = function(enemy)
    {
        return this.CollisionRect().Intersects(enemy.Rect());
    }
    
    this.RollToLeft = function()
    {
        var idx = this.fighterImages.indexOf(this.img);
        idx = Math.max(idx-1, 0);
        this.img = this.fighterImages[idx];
    }
    
    this.RollToRight = function()
    {
        var idx = this.fighterImages.indexOf(this.img);
        idx = Math.min(idx+1, this.fighterImages.length-1);
        this.img = this.fighterImages[idx];
    }
    
    this.RollToCentre = function()
    {
        var idx = this.fighterImages.indexOf(this.img);
        
        if(idx > this.centreImage)
        {
            --idx;
        }
        else if(idx < this.centreImage)
        {
            ++idx;
        }

        this.img = this.fighterImages[idx];
    }
}

// Explostion - represents a sequence of images which when played back create
// an explosion animation
function Explosion(images)
{
    this.images = images;
    this.currentImageIndex = 0;
    
    // left and top are the x and y positions of the explosion in terms of a 
    // percentage canvas width and height (range 0..1)
    this.position = new Point(0,0);
    
    // Calculate the width and height to ensure the fighter maintains its original
    // aspect ratio at the current canvas size. width and height are expressed as
    // a percentage of the canvas width and height (range 0..1)
    this.imageAspectRatio = 1.0;
    this.width = 0.25;
    this.height = ((this.width * canvasWidth) / this.imageAspectRatio) / canvasHeight;
    
    // active determines if the explosion is currently playing back
    this.active = false;
    
    this.Rect = function()
    {
        var rect = new Rect(0,0,0,0);
        rect.left = this.position.x;
        rect.top = this.position.y;
        rect.right = rect.left + this.width;
        rect.bottom = rect.top + this.height;
        
        return rect;
    }
    
    // Start the explosion image sequence playing back.
    // Delay the start of the explosion by passing the number of frames as the
    // delay parameter
    this.Start = function(centre, delay)
    {
        this.position.x = centre.x - (this.Rect().Width() / 2);
        this.position.y = centre.y - (this.Rect().Height() / 2);
        
        this.currentImageIndex = 0 - delay;
        this.active = true;
    }
    
    this.NextImage = function()
    {
        this.currentImageIndex++;
        this.active = this.currentImageIndex < this.images.length;
    }
    
    this.Draw = function(canvas)
    {
        if(this.active)
        {
            if(this.currentImageIndex >= 0)
            {
                canvas.DrawImage(
                    this.images[this.currentImageIndex], this.position.x, this.position.y, this.width, this.height, 0);
            }
        }
    }
}