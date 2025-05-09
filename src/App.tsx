import { useEffect, useState } from "react";
import Swal from "sweetalert2";
function formatDate(inputDate: string) {
  // Step 1: Parse the input into a Date object
  const date = new Date(inputDate);

  // Step 2: Extract day, month, and year
  const day = date.getDate(); // Returns the day of the month (1–31)
  const monthIndex = date.getMonth(); // Returns the month index (0–11)
  const year = date.getFullYear(); // Returns the full year (e.g., 2020)

  // Step 3: Map the numeric month index to its name
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthName = months[monthIndex];

  // Step 4: Construct the formatted date string
  return `${day} ${monthName} ${year}`;
}

const formatDuration = (durationInSeconds: any) => {
  const minutes = String(Math.floor(durationInSeconds / 60)).padStart(2, "0"); // Convert to minutes
  const seconds = String(Math.floor(durationInSeconds % 60)).padStart(2, "0"); // Remaining seconds
  return `${minutes}:${seconds}`;
};
function isImageOrVideo(url: string) {
  const extension = url.split(".").pop()?.toLowerCase() || "";

  // Check if the extension corresponds to an image or video
  if (["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension)) {
    return "image";
  } else if (["mp4", "webm", "ogg", "mov"].includes(extension)) {
    return "video";
  } else {
    return "unknown";
  }
}
function App() {
  const [isInExt, setIsInExt] = useState(false);
  const [isLoading, setLoading] = useState(false);

  const [selectedData, setSelectedData] = useState<any[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dataType, setDataType] = useState<string>("Vault");

  const [vaultData, setVaultData] = useState<any[]>([]);

  const [postData, setPostData] = useState<any[]>([]);
  // const [currentPage, setCurrentPage] = useState(1);
  useEffect(() => {
    console.log("KMT Host: ", window.location.host);

    setIsInExt(window.location.host !== "fancentro.com");
  }, []);

  const exportVaultData = async () => {
    setIsModalOpen(true);
    let currentPage = 1;

    let allData: any = [];
    setLoading(true);

    try {
      while (true) {
        const res = await fetch(
          `https://fancentro.com/admin/lapi/vaultItems?include=storageResource,meta,vaultResourceTag.resourceTag&thumbnailSizes%5Bstorage.resourcePath%5D=origin&page%5Bsize%5D=60&page%5Bnumber%5D=${currentPage}&filter%5BmediaType%5D%5B0%5D=image&filter%5BmediaType%5D%5B1%5D=video&sort=-createdAt&thumbnailSizes%5BvaultItem.thumb%5D=AEzPQNtN5e`
        );

        const data = await res.json();

        if (!data || !data.data || data.data.length === 0) {
          break;
        }
        await processData(data);
        allData = allData.concat(data.data);

        currentPage++;
      }
      const res = await fetch("https://fancentro.com/admin/api/post.get");
      const data = await res.json();

      console.log(data);

      const postDataArray = data.response.collection.map((post: any) => {
        const originLink =
          post.resources.collection[0]?.["links(origin)"]?.resource || null;
        const thumbnail = post["mainThumb(w350i)"] || null;
        const title = post.title;
        const body = post.body;

        const tags = post.tags.map((tag: any) => tag.alias);

        return {
          origin: originLink,
          thumbnail: thumbnail,
          title: title,
          body: body,
          tags: tags,
        };
      });
      setPostData(postDataArray);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        title: "Oops!",
        text: "An error occurred while fetching data.",
        icon: "error",
      });
    }
  };

  function findIncludedItem(type: string, id: string, response: any) {
    return response.included.find(
      (item: any) => item.type === type && item.id == id
    );
  }

  const processData = async (response: any) => {
    const newArray = [];
    for (const element of response.data) {
      const storageResource = findIncludedItem(
        "storageResources",
        element?.relationships?.storageResource?.data?.id || "noId",
        response
      );

      const vaultMeta = findIncludedItem(
        "vaultMeta",
        element.relationships?.meta?.data
          ? element?.relationships?.meta?.data?.id
          : "noId",
        response
      );

      const tagsArray = response.included
        .filter(
          (item: any) =>
            item.type === "vaultResourceTags" &&
            item.attributes.vaultId == element.id
        )
        .map((tagItem: any) =>
          findIncludedItem(
            "resourceTags",
            tagItem.attributes.resourceTagId,
            response
          )
        )
        .filter(Boolean);

      const newItem = {
        ...element,
        storageResource: storageResource,
        vaultMeta: vaultMeta,
        tags: tagsArray,
      };

      newArray.push(newItem);
    }

    setVaultData(newArray);
    console.log(newArray);
  };

  const exportAllData = async () => {
    if (selectedData.length === 0) {
      Swal.fire("Please select a data file to export", "", "error");
      return;
    }
    Swal.fire({
      title: "Export Data",
      icon: "warning",
      showCancelButton: true,
      input: "text",
      inputPlaceholder: "Enter your credentials",
      confirmButtonText: "Yes, Export it!",
      cancelButtonText: "No, cancel",
    }).then((result) => {
      if (result.isConfirmed) {
        const inputValue = result.value;
        if (dataType === "Vault") {
          selectedData.forEach((item, index) => {
            if (item.storageResource.attributes.mediaType === "video") {
              downloadFile(
                item.storageResource.attributes.resourcePath,
                `file${index + 1}`
              );
            } else {
              downloadFile(
                item.storageResource.attributes.resourcePath.origin,
                `file${index + 1}`
              );
            }
          });
        } else {
          selectedData.forEach((item, index) => {
            downloadFile(item.origin, `post${index + 1}`);
          });
        }

        if (inputValue) {
          Swal.fire("Success!", `You entered: ${inputValue}`, "success");
        } else {
          Swal.fire("Error!", "No credentials entered.", "error");
        }
      } else {
        Swal.fire("Cancelled", "Export operation was cancelled.", "info");
      }
    });
    setIsModalOpen(false);
    console.log(selectedData);
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      const blob = await response.blob();

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error("Error downloading file:", error);
    }
  };

  const handleCheckboxChange = (isChecked: boolean, item: any) => {
    if (isChecked) {
      setSelectedData((prevSelected) => [...prevSelected, item]);
    } else {
      setSelectedData((prevSelected) =>
        prevSelected.filter((selectedItem) => selectedItem.id !== item.id)
      );
    }
  };

  const handleTabChange = (tab: string) => {
    setDataType(tab);
    setSelectedData([]);
  };

  return (
    <>
      {isInExt ? (
        <ExtUi />
      ) : (
        <>
          <div
            style={{
              position: "fixed",
              bottom: "1em",
              left: "1em",
              padding: "1em",
            }}
          >
            <button className="export-btn" onClick={exportVaultData}>
              Scan Data
            </button>
          </div>

          {isModalOpen && (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                flexDirection: "column",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 9999999,
              }}
            >
              <div
                style={{
                  backgroundColor: "white",
                  padding: "0.5em 1em 0",
                  width: "70vw",
                  fontSize: "1.5em",
                  cursor: "pointer",
                  textAlign: "right",
                }}
              >
                <p
                  style={{ margin: "0" }}
                  onClick={() => setIsModalOpen(false)}
                >
                  x
                </p>
              </div>

              <h1
                style={{
                  textAlign: "center",
                  background: "white",
                  width: "70vw",
                  margin: "0",
                }}
              >
                Export {dataType} Data
              </h1>

              <div className="data-selection">
                <p
                  className={
                    dataType === "Vault" ? "data-selected" : "data-name"
                  }
                  onClick={() => handleTabChange("Vault")}
                >
                  Vault Data: {vaultData.length}
                </p>
                <p
                  className={
                    dataType === "Posts" ? "data-selected" : "data-name"
                  }
                  onClick={() => handleTabChange("Posts")}
                >
                  Post Data: {postData.length}
                </p>
                <button className="data-transfer-btn" onClick={exportAllData}>
                  Export Data
                </button>
              </div>

              <div
              className="vault-data-main-container"
                style={{
                 
                }}
              >
                {isLoading ? (
                  <div className="loader-box">
                    <div className="loader"></div>
                  </div>
                ) : (
                  <>
                    {dataType === "Vault" ? (
                      <div className="vault-data-container">
                        {vaultData.map((res) => (
                          <div key={res.id} style={{ position: "relative" }}>
                            <img
                              width={"100%"}
                              style={{
                                aspectRatio: "16/9",
                                objectFit: "cover",
                              }}
                              src={res.attributes?.thumbs?.w450_h600l}
                              alt=""
                            />
                            <div className="checkboxes__item">
                              <label className="checkbox style-d">
                                <input
                                  type="checkbox"
                                  onChange={(e) =>
                                    handleCheckboxChange(e.target.checked, res)
                                  }
                                />
                                <div className="checkbox__checkmark"></div>
                              </label>
                            </div>
                            {res.tags && (
                              <div
                                style={{
                                  background: "rgba(0, 0, 0, 0.1)",
                                  padding: "0.5em",
                                }}
                              >
                                Tags:
                                {res.tags

                                  .map((t: any) => t.attributes.name)
                                  .join(", ")}
                              </div>
                            )}
                            {res.attributes?.mediaType === "video" && (
                              <div className="video-play-icon">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  height="40px"
                                  viewBox="0 -960 960 960"
                                  width="40px"
                                  fill="#ffff"
                                >
                                  <path d="M382-306.67 653.33-480 382-653.33v346.66ZM480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-156t85.83-127q54.34-54 127.34-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82.33-31.5 155.33-31.5 73-85.5 127.34Q709-143 636-111.5T480-80Zm0-66.67q139.33 0 236.33-97.33t97-236q0-139.33-97-236.33t-236.33-97q-138.67 0-236 97-97.33 97-97.33 236.33 0 138.67 97.33 236 97.33 97.33 236 97.33ZM480-480Z" />
                                </svg>
                              </div>
                            )}
                            {res.attributes?.mediaType === "video" &&
                              res?.attributes?.duration && (
                                <div className="video-duration">
                                  {formatDuration(res.attributes?.duration)}
                                </div>
                              )}

                            <div className="media-date">
                              {formatDate(res.attributes?.createdAt)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="posts-data-container">
                        {postData.map((res) => (
                          <div
                            key={res.id}
                            style={{
                              position: "relative",
                              border: "1px solid #ebebeb",
                            }}
                          >
                            <div
                              style={{
                                position: "relative",
                              }}
                            >
                              <img
                                width={"100%"}
                                style={{
                                  aspectRatio: "16/9",
                                  objectFit: "cover",
                                }}
                                src={res.thumbnail}
                                alt=""
                              />
                              <div className="checkboxes__item">
                                <label className="checkbox style-d">
                                  <input
                                    type="checkbox"
                                    onChange={(e) =>
                                      handleCheckboxChange(
                                        e.target.checked,
                                        res
                                      )
                                    }
                                  />
                                  <div className="checkbox__checkmark"></div>
                                </label>
                              </div>
                              {isImageOrVideo(res.origin) === "video" && (
                                <div className="video-play-icon">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    height="40px"
                                    viewBox="0 -960 960 960"
                                    width="40px"
                                    fill="#ffff"
                                  >
                                    <path d="M382-306.67 653.33-480 382-653.33v346.66ZM480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-156t85.83-127q54.34-54 127.34-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82.33-31.5 155.33-31.5 73-85.5 127.34Q709-143 636-111.5T480-80Zm0-66.67q139.33 0 236.33-97.33t97-236q0-139.33-97-236.33t-236.33-97q-138.67 0-236 97-97.33 97-97.33 236.33 0 138.67 97.33 236 97.33 97.33 236 97.33ZM480-480Z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div style={{ padding: "1em" }}>
                              <h4>{res.title}</h4>
                              <div
                                dangerouslySetInnerHTML={{ __html: res.body }}
                              />
                              <div>
                                Tags:{" "}
                                {res.tags
                                  ? res.tags
                                      .map((tag: string[]) => tag)
                                      .join(", ")
                                  : "NA"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

function ExtUi() {
  return (
    <div>
      <h1>Hello, form KMT</h1>
      <button onClick={() => window.location.reload()}>
        Click to Enable KMT, then reload this page
      </button>
    </div>
  );
}

export default App;
