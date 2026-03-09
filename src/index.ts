const canvas = document.getElementById('game') as HTMLCanvasElement;
canvas.width = 400;
canvas.height = 800;

const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#111';
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = '#0ff';
ctx.font = '24px monospace';
ctx.textAlign = 'center';
ctx.fillText('Otris', canvas.width / 2, canvas.height / 2);
