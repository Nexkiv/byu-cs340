type Image = string;

function editImage(sourceImageString: string, args: readonly string[]): Image {
    const filter: string | undefined = args.at(0);
    const sourceImage: Image = sourceImageString;
    let finalImage: Image;

    switch (filter) {
        case 'grayscale':
            break;
        case 'invert':
            break;
        case 'emboss':
            break;
        case 'motionblur':
            break;
        default:
            // This should result in the display of the error message
    }

    return finalImage;
}

function grayscale(sourceImage: Image): Image {
    let finalImage: Image;
}

function invert(sourceImage: Image): Image {
    let finalImage: Image;
}

function emboss(sourceImage: Image): Image {
    let finalImage: Image;
}

function motionblur(sourceImage: Image, length: number): Image {
    let finalImage: Image;
}