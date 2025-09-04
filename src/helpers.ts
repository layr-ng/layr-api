import { NextFunction, Request, Response } from "express";

import baseX from "base-x";
import { NODE_ENV, PORT } from "./config";
import { join } from "path";
import { BrandInfo } from "./constants";
import formidable from "formidable";

const DEFAULT_IMAGE_PATH = "/uploads/";

type ImageDir = "diagrams";

export function constructImageSubPath(
  imageDir: ImageDir,
  imageName: string | null
): string {
  if (!imageName) {
    return "";
  }
  return NODE_ENV !== "development"
    ? `assets.${BrandInfo.domain}/${imageDir}/${imageName}`
    : `http://localhost:${PORT}${DEFAULT_IMAGE_PATH}${imageDir}/${imageName}`;
}
interface File {
  newFilename: string;
  originalFilename: string;
  filepath: string;
}
export async function uploadImagesToVPS(
  files: File[],
  uploadDir: ImageDir
): Promise<string[]> {
  const result: (string | null)[] = files.map((file) => {
    const fileExtension = file.originalFilename.split(".").pop();
    const name = `${file.newFilename}.${fileExtension}`;

    let destination = join(__dirname, "../public/uploads/", uploadDir);

    if (NODE_ENV !== "development") {
      destination = `/var/www/${BrandInfo.domain}/${uploadDir}`;
    }

    const fs = require("fs");
    const path = require("path");

    if (NODE_ENV !== "development") {
      destination = `/var/www/${BrandInfo.domain}/${uploadDir}`;
    }

    try {
      // Ensure the destination directory exists
      if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true }); // Create it if it doesn’t exist
      }

      const newPath = path.join(destination, name);

      // Move the file asynchronously
      fs.rename(file.filepath, newPath, (err: any) => {
        if (err) {
          console.error("Could not upload one or more product images", err);
          return null;
        }
        console.log("File uploaded successfully:", newPath);
      });
      return name; // Return the file name
    } catch (err) {
      console.error("File upload failed", err);
      return null;
    }
  });

  return result.filter(Boolean) as string[]; // Filter out failed uploads
}

export function parseFieldsAndFiles(req: Request): Promise<{
  err: Error | null;
  fields: Record<string, any>;
  imageFiles: formidable.File[];
}> {
  return new Promise((resolve) => {
    const form = formidable();
    form.parse(req, (err, fields, files) => {
      if (err) {
        resolve({ err, fields: {}, imageFiles: [] });
        return;
      }

      const parsedFields: Record<string, any> = {};
      Object.entries(fields).forEach(([key, value]) => {
        parsedFields[key] = Array.isArray(value) ? value[0] : value;
      });

      const imageFiles = Array.isArray(files.images)
        ? files.images
        : [files.images].filter(Boolean);

      resolve({
        err: null,
        fields: parsedFields,
        imageFiles: imageFiles as any,
      });
    });
  });
}

export const okResponse = <T = any>(
  res: Response,
  { message = "Success", data }: { message?: string; data?: T } = {}
) => {
  // Check if data has rows and pagination
  if (
    data &&
    typeof data === "object" &&
    "rows" in data &&
    "pagination" in data
  ) {
    const { rows, pagination } = data as any;

    // Create new pagination object without offset and with correct page_size
    const newPagination = {
      ...pagination,
      page_size: rows?.length || 0,
    };
    delete newPagination.offset;

    // Create new data object with updated pagination
    const newData = {
      ...data,
      pagination: newPagination,
    };

    return res.status(200).json({
      status: "ok",
      message,
      data: newData,
    } as IApiResponse<T>);
  }

  // Default case
  return res.status(200).json({
    status: "ok",
    message,
    ...(data !== undefined && { data }),
  } as IApiResponse<T>);
};

const BASE62 = baseX(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
);
// Helper function to convert hex string to Uint8Array
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

// Helper function to convert Uint8Array back to hex
function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

// Encode UUID to Base62
export function encodeToBase62(uuid: string): string {
  const hex = uuid.replace(/-/g, ""); // Remove hyphens
  const bytes = hexToUint8Array(hex);
  return BASE62.encode(bytes);
}

// Decode Base62 back to UUID
export function decodeFromBase62(base62: string): string {
  const bytes = BASE62.decode(base62);
  const hex = uint8ArrayToHex(bytes);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function getClientInfo(req: Request): { ip: string; userAgent: string } {
  let ip = "";

  // Get `x-forwarded-for` header if available
  const xForwardedFor = req.headers["x-forwarded-for"];
  if (typeof xForwardedFor === "string") {
    ip = xForwardedFor.split(",")[0].trim();
  } else if (Array.isArray(xForwardedFor)) {
    ip = xForwardedFor[0].trim();
  }

  // Fallback to direct connection IP
  if (!ip) {
    ip = req.socket.remoteAddress || req.connection.remoteAddress || "";
  }

  // Normalize IPv6-mapped IPv4 addresses (`::ffff:192.168.1.1` → `192.168.1.1`)
  if (ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  // Convert IPv6 localhost to IPv4
  if (ip === "::1") {
    ip = "127.0.0.1";
  }

  // Get User-Agent from request headers
  const userAgent = req.headers["user-agent"] || "Unknown";

  return { ip, userAgent };
}

export function TryCatch(errorHandler?: (error: any) => void) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (errorHandler) {
          errorHandler(error);
        } else {
          console.error(`Error in ${propertyKey}:`, error);
        }
      }
    };

    return descriptor;
  };
}
export const getUserFromCaller = (req: Request) => {
  const caller = req.__caller__;

  let user_id: string;

  if (!["admin", "public"].includes(caller)) {
    throw Error("Invalid caller type of " + caller);
  }

  if (caller === "admin") {
    user_id = req.params.user_id;
  } else {
    user_id = req.__user__!.id;
  }

  return { user_id };
};
export function constructPagination(pagination = { page: 1, page_size: 7 }) {
  const { page, page_size } = pagination;
  let newpage = parseInt(page as any);
  let newpage_size = parseInt(page_size as any);
  if (isNaN(newpage) || newpage < 1) {
    newpage = 1;
  }
  if (isNaN(newpage_size) || newpage_size < 1 || newpage_size > 7) {
    newpage_size = 7;
  }
  return {
    page: newpage as any,
    page_size: newpage_size,
    offset: (newpage - 1) * newpage_size,
  };
}
export const setPaginationParameters = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  req.__pagination__ = constructPagination(req.query as any);
  return next();
};
