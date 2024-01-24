'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { beep } from '@/utils/audio';
import {
	Camera,
	CircleDot,
	FlipHorizontal,
	Loader2,
	PersonStanding,
	Video,
	Volume2,
	VolumeX,
} from 'lucide-react';
import { RefObject, useEffect, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { toast } from 'sonner';

import '@tensorflow/tfjs-backend-cpu';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { drawOnCanvas } from '@/utils/draw';

const formatDate = (d: Date) => {
	const formattedDate =
		[
			(d.getMonth() + 1).toString().padStart(2, '0'),
			d.getDate().toString().padStart(2, '0'),
			d.getFullYear(),
		].join('-') +
		' ' +
		[
			d.getHours().toString().padStart(2, '0'),
			d.getMinutes().toString().padStart(2, '0'),
			d.getSeconds().toString().padStart(2, '0'),
		].join('-');
	return formattedDate;
};

let interval: any = null;
let stopTimeout: any = null;
export default function HomePage() {
	const webcamRef = useRef<Webcam>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const [mirrored, setMirrored] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isRecordVideo, setIsRecordVideo] = useState(false);
	const [isAutoRecordVideo, setIsAutoRecordVideo] = useState(false);
	const [volume, setVolume] = useState(0.5);
	const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);

	const mediaRecorderRef = useRef<MediaRecorder | null>(null);

	useEffect(() => {
		if (webcamRef && webcamRef.current) {
			const stream = (webcamRef.current.video as any).captureStream();
			if (!stream) return;

			mediaRecorderRef.current = new MediaRecorder(stream);

			mediaRecorderRef.current.ondataavailable = e => {
				if (e.data.size > 0) {
					const recordedBlob = new Blob([e.data], { type: 'video' });
					const videoUrl = URL.createObjectURL(recordedBlob);

					console.log('videoUrl', videoUrl);
					console.log('recordedBlob', recordedBlob);

					const a = document.createElement('a');
					a.href = videoUrl;
					a.download = `${formatDate(new Date())}.webm`;
					a.click();
				}
			};

			mediaRecorderRef.current.onstart = e => {
				setIsRecordVideo(true);
			};
			mediaRecorderRef.current.onstop = e => {
				setIsRecordVideo(false);
			};
		}
	}, [webcamRef]);

	useEffect(() => {
		initModel();
	}, []);

	useEffect(() => {
		interval = setInterval(() => {
			runPrediction();
		}, 100);

		return () => clearInterval(interval);
	}, [webcamRef.current, model, mirrored, isAutoRecordVideo]);

	const initModel = async () => {
		setIsLoading(true);
		const model: cocoSsd.ObjectDetection = await cocoSsd.load({
			base: 'mobilenet_v2',
		});

		setModel(model);
		setIsLoading(false);
	};

	const runPrediction = async () => {
		if (
			model &&
			webcamRef.current &&
			webcamRef.current.video?.readyState === 4
		) {
			const predictions = await model.detect(webcamRef.current.video);

			resizeCanvas(canvasRef, webcamRef);
			drawOnCanvas(mirrored, predictions, canvasRef.current?.getContext('2d'));

			let isPerson = false;
			if (predictions.length) {
				predictions.forEach(
					prediction => (isPerson = prediction.class === 'person')
				);
			}

			if (isPerson && isAutoRecordVideo) startRecording(true);
		}
	};

	const userPromptRecord = () => {
		if (!webcamRef.current) {
			return toast.error(
				'Камера не знайдена! Спробуйте перезавантажити сторінку!'
			);
		}

		if (mediaRecorderRef.current?.state === 'recording') {
			mediaRecorderRef.current.requestData();
			mediaRecorderRef.current.stop();
			clearTimeout(stopTimeout);
			toast.info('Запис успішно збережений!');
		} else {
			startRecording();
		}
	};

	const startRecording = (doBeep?: boolean) => {
		if (webcamRef.current && mediaRecorderRef.current?.state !== 'recording') {
			isAutoRecordVideo && toast.info('Почався автозапис відео!');
			mediaRecorderRef.current?.start();
			doBeep && beep(volume);

			stopTimeout = setTimeout(() => {
				if (mediaRecorderRef.current?.state === 'recording') {
					mediaRecorderRef.current.requestData();
					mediaRecorderRef.current.stop();
				}
			}, 3000);
		}
	};

	const toggleAutoRecord = () => {
		if (isAutoRecordVideo) {
			setIsAutoRecordVideo(false);
			toast.info('Автозапис вимкнено!');
		} else {
			setIsAutoRecordVideo(true);
			toast.info('Автозапис увімкнено!');
		}
	};

	return (
		<div className='flex h-screen'>
			<div className='relative h-screen w-full'>
				<Webcam
					ref={webcamRef}
					mirrored={mirrored}
					className='h-screen w-screen object-contain'
				/>
				<canvas
					className='absolute top-0 left-0 h-full w-full object-contain'
					ref={canvasRef}
				></canvas>
			</div>
			<div className='flex'>
				<div className='border-primary/5 border-2 max-w-xs flex flex-col gap-2 justify-between shadow-md rounded-md p-4'>
					<div className='flex flex-col gap-2'>
						<ThemeToggle />
						<Button variant='outline' size='icon'>
							<FlipHorizontal onClick={() => setMirrored(!mirrored)} />
						</Button>
						<Separator className='my-2' />
					</div>
					<div className='flex flex-col gap-2'>
						<Button
							variant={isRecordVideo ? 'destructive' : 'outline'}
							size='icon'
							onClick={userPromptRecord}
						>
							<Video />
						</Button>
						<Separator className='my-2' />
						<Button
							variant={isAutoRecordVideo ? 'destructive' : 'outline'}
							size='icon'
							onClick={toggleAutoRecord}
						>
							{isAutoRecordVideo ? (
								<CircleDot className='animate-ping w-3 h-3' />
							) : (
								<PersonStanding />
							)}
						</Button>
					</div>

					<div className='flex flex-col gap-2'>
						<Separator className='my-2' />
						<Popover>
							<PopoverTrigger asChild>
								<Button variant='outline' size='icon'>
									{volume ? <Volume2 /> : <VolumeX />}
								</Button>
							</PopoverTrigger>
							<PopoverContent>
								<Slider
									max={1}
									min={0}
									step={0.2}
									defaultValue={[volume]}
									value={[volume]}
									onValueChange={val => {
										setVolume(val[0]);
										beep(val[0]);
									}}
								/>
							</PopoverContent>
						</Popover>
					</div>
				</div>
			</div>
			{isLoading && (
				<div className='z-50 absolute w-full h-full flex items-center justify-center bg-primary-foreground gap-x-3'>
					Завантажуємо необхідне...
					<Loader2 className='animate-spin text-red-400' />
				</div>
			)}
		</div>
	);
}
const resizeCanvas = (
	canvasRef: RefObject<HTMLCanvasElement>,
	webcamRef: RefObject<Webcam>
) => {
	const canvas = canvasRef.current;
	const video = webcamRef.current?.video;

	if (!canvas || !video) return;

	const { videoWidth, videoHeight } = video;

	canvas.width = videoWidth;
	canvas.height = videoHeight;
};
