import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Camera, RotateCcw } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose: () => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      // Try with facingMode first, fallback if not supported
      let constraints: any = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      // Add facingMode with fallback
      try {
        constraints.video.facingMode = { ideal: facingMode };
      } catch (e) {
        console.warn("facingMode not supported, using default");
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.play().catch((err) => {
          console.error("Error playing video:", err);
        });
      }
    } catch (error: any) {
      console.error("Error accessing camera:", error);
      const errorMessage = error?.name === "NotAllowedError" 
        ? "กรุณาอนุญาติการเข้าถึงกล้อง"
        : error?.name === "NotFoundError"
        ? "ไม่พบกล้องในอุปกรณ์นี้"
        : "ไม่สามารถเข้าถึงกล้องได้";
      toast.error(errorMessage);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsReady(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext("2d");
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        onCapture(file);
        stopCamera();
        onClose();
        toast.success("บันทึกรูปภาพเรียบร้อย");
      }
    }, "image/jpeg", 0.95);
  };

  const toggleFacingMode = async () => {
    stopCamera();
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  React.useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg max-w-md w-full overflow-hidden">
        <div className="relative bg-black aspect-video flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => {
              console.log("Video loaded successfully");
              setIsReady(true);
            }}
            onError={(e) => {
              console.error("Video error:", e);
              toast.error("เกิดข้อผิดพลาดในการเล่นวิดีโอ");
            }}
            className="w-full h-full object-cover"
          />
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div className="text-white text-center">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">กำลังเปิดกล้อง...</p>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={capturePhoto}
              disabled={!isReady}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              ถ่ายรูป
            </Button>
            <Button
              onClick={toggleFacingMode}
              disabled={!isReady}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              สลับกล้อง
            </Button>
          </div>
          <Button onClick={onClose} variant="outline" className="w-full">
            <X className="w-4 h-4 mr-2" />
            ปิด
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
