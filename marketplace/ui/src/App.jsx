import { useEffect, useState } from "react";
import { contractAbi } from "./abi";
import { ethers } from "ethers";
import { TextField, Button, Typography, Card, CardContent, Grid2, Container, Box } from '@mui/material';
import { pink } from "@mui/material/colors";
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const theme = createTheme({
  palette: {
    primary: {
      main: pink[500],
    },
    secondary: {
      main: '#f50057',
    },
  },
});

function App() {
  const CONTRACT_ADDRESS = "0x13a935753a7173ba0a9fa6675f973a75330404c8";
  const CONTRACT_ABI = contractAbi;

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [account, setAccount] = useState("");
  const [items, setItems] = useState([]);
  const [ownedItems, setOwnedItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: "", price: "" });

  useEffect(() => {
    const init = async () => {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.BrowserProvider(window.ethereum);
        setProvider(provider);

        window.ethereum.on("accountsChanged", async (accounts) => {
          setAccount(accounts[0]);
          console.log("Account changed", accounts[0]);
          
          const signer = await provider.getSigner();
          setSigner(signer);
          const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
          const contractWithProvider = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          setContract(contractWithSigner);
          loadItems(contractWithProvider);
          loadOwnedItems(contractWithProvider, accounts[0]);
        });

        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);

        const signer = await provider.getSigner();
        setSigner(signer);

        const contractWithSigner = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        const contractWithProvider = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
        setContract(contractWithSigner);

        loadItems(contractWithProvider);
        loadOwnedItems(contractWithProvider, accounts[0]);

        contractWithSigner.on("ItemAdded", (id, name, price, seller) => {
          toast.success(`Item Added: ${name} with price ${ethers.formatEther(price)} ETH`);
        });

        contractWithSigner.on("ItemSold", (id, buyer) => {
          toast.success(`Item Sold: ID ${id} bought by ${buyer}`);
        });
      }
    };
    init();
  }, []);

  const loadItems = async (contract) => {
    const itemCount = await contract.itemCount();
    let items = [];
    for (let i = 1; i <= itemCount; i++) {
      const item = await contract.items(i);
      items.push(item);
    }
    setItems(items);
  };

  const loadOwnedItems = async (contract, owner) => {
    const ownedItemIds = await contract.getItemsByOwner(owner);
    let ownedItems = [];
    for (let i = 0; i < ownedItemIds.length; i++) {
      const item = await contract.items(ownedItemIds[i]);
      ownedItems.push(item);
    }
    setOwnedItems(ownedItems);
  };

  const listItem = async () => {
    try {
      const tx = await contract.listItem(newItem.name, ethers.parseEther(newItem.price));
      await tx.wait();
      toast.success("Item listed successfully!");
      const contractWithProvider = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      loadItems(contractWithProvider);
    } catch (error) {
      toast.error("Failed to list item!");
    }
  };

  const purchaseItem = async (id, price) => {
    try {
      const tx = await contract.purchaseItem(id, { value: price });
      await tx.wait();
      toast.success("Item purchased successfully!");
      const contractWithProvider = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      loadItems(contractWithProvider);
      loadOwnedItems(contractWithProvider, account);
    } catch (error) {
      toast.error("Failed to purchase item!");
    }
  };

  const transferItem = async (id, toAddress) => {
    try {
      const tx = await contract.transferItem(id, toAddress);
      await tx.wait();
      toast.success("Item transferred successfully!");
      const contractWithProvider = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      loadItems(contractWithProvider);
      loadOwnedItems(contractWithProvider, account);
    } catch (error) {
      toast.error("Failed to transfer item!");
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container>
        <ToastContainer />
        <Typography variant="h3" align="center" gutterBottom>
          Marketplace
        </Typography>

        {/* List new item section */}
        <Card variant="outlined" sx={{ mb: 4, p: 2 }}>
          <CardContent>
            <Typography variant="h5" gutterBottom>
              List New Item
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Item Name"
                variant="outlined"
                fullWidth
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <TextField
                label="Item Price (in ETH)"
                variant="outlined"
                fullWidth
                value={newItem.price}
                onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={listItem}
                fullWidth
              >
                List Item
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Items for sale */}
        <Typography variant="h5" gutterBottom>
          Items for Sale
        </Typography>
        <Grid2 container spacing={3}>
          {items.map((item) => (
            <Grid2 item xs={12} sm={6} md={4} key={item.Id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">{item.Name}</Typography>
                  <Typography>Price: {ethers.formatEther(item.Price)} ETH</Typography>
                  <Typography>Owner: {item.Owner}</Typography>
                  {!item.IsSold && item.Owner !== account && (
                    <Button
                      variant="contained"
                      color="secondary"
                      onClick={() => purchaseItem(item.Id, item.Price)}
                      fullWidth
                    >
                      Purchase
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>

        {/* Owned Items */}
        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          Your Items
        </Typography>
        <Grid2 container spacing={3}>
          {ownedItems.map((item) => (
            <Grid2 item xs={12} sm={6} md={4} key={item.Id}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6">{item.Name}</Typography>
                  <Typography>Price: {item.Price} ETH</Typography>
                  <Typography>Owner: {item.Owner}</Typography>
                  <TextField
                    label="Transfer to Address"
                    variant="outlined"
                    fullWidth
                    id={`transferAddress${item.Id}`}
                  />
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => transferItem(item.Id, document.getElementById(`transferAddress${item.Id}`).value)}
                    fullWidth
                    sx={{ mt: 2 }}
                  >
                    Transfer
                  </Button>
                </CardContent>
              </Card>
            </Grid2>
          ))}
        </Grid2>
      </Container>
    </ThemeProvider>
  );
}

export default App;
