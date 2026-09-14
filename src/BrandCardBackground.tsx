import React from "react";
import { Img, staticFile } from "remotion";

// Full-bleed ServiceNow brand gradient + navy overlay, used by the
// full-frame graphics (TitleCard/OutroCard/QuoteCard). The image is
// 3840x2160 (16:9), an exact aspect match for the 1920x1080 canvas, so
// "cover" fits it with zero cropping — unlike LowerThird's small plate,
// which stretches the same asset with objectFit: "fill" instead.
export const BrandCardBackground: React.FC = () => (
	<>
		<Img
			src={staticFile("gradient-navy-green.png")}
			style={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				objectFit: "cover",
				zIndex: 0,
			}}
		/>
		<div
			style={{
				position: "absolute",
				inset: 0,
				background:
					"linear-gradient(120deg, rgba(3,45,66,0.55) 0%, rgba(3,45,66,0.72) 100%)",
				zIndex: 1,
			}}
		/>
	</>
);
