// String Demo Animation
function animateString() {
    if (window.isAnimating) return;
    window.isAnimating = true;
    
    const stringElement = document.getElementById('stringDemo');
    const startTime = performance.now();
    const duration = 1000; // 1 second
    const baselineY = stringElement.offsetHeight / 2;
    const amplitude = 20; // Maximum displacement
    const frequency = 10; // Oscillations per second

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        if (elapsed >= duration) {
            stringElement.style.transform = 'translateY(0)';
            window.isAnimating = false;
            return;
        }

        const progress = elapsed / duration;
        const decay = Math.exp(-progress * 3); // Exponential decay
        const displacement = amplitude * Math.sin(progress * Math.PI * 2 * frequency) * decay;
        stringElement.style.transform = `translateY(${displacement}px)`;

        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

// Guitar String Class with Enhanced Physics
class GuitarString {
    constructor(svgLine, index) {
        this.line = svgLine;
        this.index = index;
        this.isPlucking = false;
        this.x1 = parseFloat(svgLine.getAttribute('x1'));
        this.x2 = parseFloat(svgLine.getAttribute('x2'));
        this.originalY = parseFloat(svgLine.getAttribute('y1'));
        this.originalY2 = parseFloat(svgLine.getAttribute('y2'));
        this.frequency = 6 - index;
        this.decay = 0.95;
        this.setupInteraction();
        this.createHitArea();
    }

    createHitArea() {
        // Create a wider invisible area for easier interaction
        const hitArea = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        hitArea.setAttribute('x', this.x1);
        hitArea.setAttribute('y', this.originalY - 10); // Wider hit area
        hitArea.setAttribute('width', this.x2 - this.x1);
        hitArea.setAttribute('height', 20); // Wider hit area
        hitArea.setAttribute('fill', 'transparent');
        hitArea.setAttribute('class', 'string-hit-area');
        hitArea.style.cursor = 'pointer';
        
        this.line.parentNode.insertBefore(hitArea, this.line);
        this.hitArea = hitArea;

        // Add events to hit area
        this.hitArea.addEventListener('mousedown', (e) => this.startPluck(e));
        this.hitArea.addEventListener('touchstart', (e) => this.startPluck(e.touches[0]));
    }

    setupInteraction() {
        document.addEventListener('mousemove', (e) => this.updatePluck(e));
        document.addEventListener('mouseup', () => this.releasePluck());
        document.addEventListener('touchmove', (e) => this.updatePluck(e.touches[0]));
        document.addEventListener('touchend', () => this.releasePluck());
    }

    startPluck(e) {
        this.isPlucking = true;
        const svg = this.line.ownerSVGElement;
        const rect = svg.getBoundingClientRect();
        const point = this.createSVGPoint(e, rect);
        this.pluckStartY = point.y;
        
        // Visual feedback
        this.line.style.stroke = '#60A5FA'; // Highlight color while plucking
        this.line.style.filter = 'drop-shadow(0 0 3px #60A5FA)';
        
        e.preventDefault();
    }

    createSVGPoint(e, rect) {
        const svg = this.line.ownerSVGElement;
        return {
            x: (e.clientX - rect.left) * (svg.viewBox.baseVal.width / rect.width),
            y: (e.clientY - rect.top) * (svg.viewBox.baseVal.height / rect.height)
        };
    }

    updatePluck(e) {
        if (!this.isPlucking) return;

        const svg = this.line.ownerSVGElement;
        const rect = svg.getBoundingClientRect();
        const point = this.createSVGPoint(e, rect);

        // Increased maximum displacement and smoother response
        const maxDisplacement = 40; // Increased from 30
        const mouseOffset = point.y - this.pluckStartY;
        const displacement = Math.max(-maxDisplacement, 
                                   Math.min(maxDisplacement, mouseOffset * 1.5)); // More responsive

        // Create smooth curve effect
        const curve = this.createStringCurve(point.x, displacement);
        this.line.setAttribute('d', curve);

        // Switch from line to path
        this.line.removeAttribute('x1');
        this.line.removeAttribute('y1');
        this.line.removeAttribute('x2');
        this.line.removeAttribute('y2');

        // Update hit area position
        this.hitArea.setAttribute('y', this.originalY + displacement - 10);
    }

    createStringCurve(mouseX, displacement) {
        const stringLength = this.x2 - this.x1;
        const tension = 0.4; // Reduced tension for easier plucking

        // Calculate the influence of mouse position
        const relativeX = Math.max(this.x1, Math.min(this.x2, mouseX));
        const t = (relativeX - this.x1) / stringLength;
        
        // Create a smoother bell curve
        const curve = [];
        const points = 50;

        curve.push(`M ${this.x1} ${this.originalY}`);

        for (let i = 1; i < points - 1; i++) {
            const x = this.x1 + (stringLength * i / (points - 1));
            const ratio = (x - this.x1) / stringLength;
            
            // Smoother bell curve formula
            const bellCurve = Math.exp(-Math.pow((ratio - t) / tension, 2));
            const y = this.originalY + (displacement * bellCurve);
            
            curve.push(`L ${x} ${y}`);
        }

        curve.push(`L ${this.x2} ${this.originalY}`);
        return curve.join(' ');
    }

    releasePluck() {
        if (!this.isPlucking) return;
        
        this.isPlucking = false;
        
        // Reset visual feedback
        this.line.style.stroke = '#D1D5DB';
        this.line.style.filter = 'none';

        // Get the current displacement
        const path = this.line.getAttribute('d');
        const maxY = path.split(' ').reduce((max, point) => {
            const y = parseFloat(point);
            return isNaN(y) ? max : Math.max(max, Math.abs(y - this.originalY));
        }, 0);

        // Reset to straight line
        this.line.removeAttribute('d');
        this.line.setAttribute('x1', this.x1);
        this.line.setAttribute('y1', this.originalY);
        this.line.setAttribute('x2', this.x2);
        this.line.setAttribute('y2', this.originalY2);

        // Reset hit area
        this.hitArea.setAttribute('y', this.originalY - 10);

        // Animate release with more dramatic effect
        this.animateRelease(maxY);
        this.playNote(maxY);
    }

    animateRelease(initialAmplitude) {
        const startTime = performance.now();
        const frequency = this.frequency * 2;
        const baseDecay = 0.997; // Slower decay for longer sustain
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const decay = Math.pow(baseDecay, elapsed);
            const displacement = initialAmplitude * 
                               Math.sin(elapsed * 0.01 * frequency) * 
                               decay;

            if (Math.abs(displacement) < 0.1) {
                this.line.setAttribute('y1', this.originalY);
                this.line.setAttribute('y2', this.originalY2);
                return;
            }

            this.line.setAttribute('y1', this.originalY + displacement);
            this.line.setAttribute('y2', this.originalY2 + displacement);
            requestAnimationFrame(animate);
        };

        requestAnimationFrame(animate);
    }

    playNote(amplitude) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        const baseFrequency = 82.41; // Low E
        const frequency = baseFrequency * Math.pow(1.059463094359, this.index * 5);
        
        // Volume based on pluck intensity
        const volume = Math.min(0.8, amplitude / 40);
        
        oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
        gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 2);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 2);
    }
}

// Add some CSS for the hit areas
const style = document.createElement('style');
style.textContent = `
    .string-hit-area:hover {
        fill: rgba(96, 165, 250, 0.1);
    }
`;
document.head.appendChild(style);

// Main initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initialize guitar strings
    const strings = Array.from(document.querySelectorAll('.guitar-string'))
        .map((string, index) => new GuitarString(string, index));

    // Intersection Observer for scroll animations
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        { threshold: 0.1 }
    );

    document.querySelectorAll('section').forEach(section => {
        observer.observe(section);
    });

    // Smooth scroll navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = anchor.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});