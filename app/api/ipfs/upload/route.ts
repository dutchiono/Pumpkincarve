import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }

    // Fetch the image from the URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image');
    }

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const formData = new FormData();
    const blob = new Blob([buffer], { type: imageResponse.headers.get('content-type') || 'image/png' });
    formData.append('file', blob, 'pumpkin.png');

    let cid;
    const pinataJWT = process.env.PINATA_JWT;

    // Try Pinata if JWT is set, otherwise use web3.storage
    if (pinataJWT) {
      console.log('Using Pinata for IPFS upload...');
      const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pinataJWT}`,
        },
        body: formData,
      });

      console.log('Pinata response status:', pinataResponse.status);
      console.log('Pinata response headers:', Object.fromEntries(pinataResponse.headers.entries()));

      if (!pinataResponse.ok) {
        const errorText = await pinataResponse.text();
        console.error('Pinata error response:', errorText);
        throw new Error(`Pinata upload failed: ${errorText}`);
      }

      const responseText = await pinataResponse.text();
      console.log('Pinata response body:', responseText);

      let pinataData;
      try {
        pinataData = JSON.parse(responseText);
      } catch (e) {
        throw new Error(`Failed to parse Pinata response as JSON: ${responseText}`);
      }

      cid = pinataData.IpfsHash;
    } else {
      // Use web3.storage
      const web3StorageToken = process.env.WEB3_STORAGE_TOKEN;

      if (!web3StorageToken) {
        throw new Error('Either PINATA_JWT or WEB3_STORAGE_TOKEN must be set');
      }

      console.log('Using web3.storage for IPFS upload...');
      const web3Response = await fetch('https://api.web3.storage/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${web3StorageToken}`,
        },
        body: formData,
      });

      if (!web3Response.ok) {
        const errorText = await web3Response.text();
        throw new Error(`Web3.Storage upload failed: ${errorText}`);
      }

      const web3Data = await web3Response.json();
      cid = web3Data.cid;
    }

    // Step 2: Add to NFT.Storage collection (optional - only if API key is set)
    const nftStorageApiKey = process.env.NFT_STORAGE_API_KEY;

    if (nftStorageApiKey) {
      try {
        // Get existing collections
        const listResponse = await fetch('https://preserve.nft.storage/api/v1/collection/list_collections', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${nftStorageApiKey}`,
          },
        });

        let collectionId;
        if (listResponse.ok) {
          const collections = await listResponse.json();
          if (collections && collections.length > 0) {
            collectionId = collections[0].id;
          }
        }

        // Create collection if none exists
        if (!collectionId) {
          const createResponse = await fetch('https://preserve.nft.storage/api/v1/collection/create_collection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${nftStorageApiKey}`,
            },
            body: JSON.stringify({
              contractAddress: process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
              collectionName: 'Pumpkin Carving NFTs',
              chainID: '8453', // Base chain ID
              network: 'Ethereum',
            }),
          });

          if (createResponse.ok) {
            const createData = await createResponse.json();
            collectionId = createData.id;
          }
        }

        // Add token to collection with timestamp as unique ID
        if (collectionId) {
          const tokenId = Date.now();
          const csvContent = `tokenID,cid\n${tokenId},${cid}`;
          const csvBlob = new Blob([csvContent], { type: 'text/csv' });

          const addTokenFormData = new FormData();
          addTokenFormData.append('collectionID', collectionId);
          addTokenFormData.append('file', csvBlob, 'tokens.csv');

          await fetch('https://preserve.nft.storage/api/v1/collection/add_tokens', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${nftStorageApiKey}`,
            },
            body: addTokenFormData,
          });
        }
      } catch (nftStorageError) {
        console.error('NFT.Storage collection step failed, but IPFS upload succeeded:', nftStorageError);
      }
    }

    // Return IPFS URL
    const ipfsUrl = `ipfs://${cid}`;

    return NextResponse.json({ ipfsUrl, cid });

  } catch (error: any) {
    console.error('IPFS upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload to IPFS' },
      { status: 500 }
    );
  }
}
