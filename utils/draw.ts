import { DetectedObject } from '@tensorflow-models/coco-ssd';

export const drawOnCanvas = (
	mirrored: boolean,
	predictions: DetectedObject[],
	ctx: CanvasRenderingContext2D | null | undefined
) => {
	predictions.forEach(detectedObject => {
		const { bbox, class: name, score } = detectedObject;
		const [x, y, width, height] = bbox;

		if (!ctx) return;

		ctx.beginPath();

		ctx.fillStyle = name === 'person' ? '#ff0f0f' : '#0000ff';
		ctx.globalAlpha = 0.4;

		mirrored
			? ctx.roundRect(ctx.canvas.width - x, y, -width, height, 8)
			: ctx.roundRect(x, y, width, height, 8);

		ctx.fill();

		ctx.font = '12px Courier New';
		ctx.fillStyle = 'black';
		ctx.globalAlpha = 1;

		mirrored
			? ctx.fillText(name, ctx.canvas.width - x - width + 10, y + 20)
			: ctx.fillText(name, x + 10, y + 20);
	});
};
